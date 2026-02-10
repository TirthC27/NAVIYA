"""
Agent Worker Loop

Continuous worker that polls for and executes tasks.
Each agent runs its own worker loop independently.
"""

import asyncio
from typing import Optional, Set
from datetime import datetime
import signal
import sys

from app.agents.registry import get_registry
from app.agents.task_executor import TaskExecutor, DEFAULT_POLL_INTERVAL, TASK_TIMEOUT_MINUTES


# ============================================
# Worker Loop Class
# ============================================

class AgentWorkerLoop:
    """
    Continuous worker loop for a specific agent.
    
    Loop behavior:
    - Poll for pending tasks every N seconds
    - If task found:
        - Lock task
        - Execute agent logic
        - Persist output
        - Update task status
    - If no task:
        - Sleep
    """
    
    def __init__(
        self,
        agent_name: str,
        poll_interval: int = DEFAULT_POLL_INTERVAL,
        max_tasks_per_cycle: int = 1
    ):
        self.agent_name = agent_name
        self.poll_interval = poll_interval
        self.max_tasks_per_cycle = max_tasks_per_cycle
        self._running = False
        self._shutdown_event = asyncio.Event()
    
    async def start(self):
        """
        Start the worker loop.
        Runs continuously until stopped.
        """
        print(f"\n[START] Starting worker loop for: {self.agent_name}")
        print(f"   Poll interval: {self.poll_interval}s")
        print(f"   Max tasks/cycle: {self.max_tasks_per_cycle}")
        
        self._running = True
        
        async with TaskExecutor() as executor:
            while self._running:
                try:
                    # Poll for pending tasks
                    tasks = await executor.poll_all_pending_tasks(
                        self.agent_name,
                        self.max_tasks_per_cycle
                    )
                    
                    if tasks:
                        print(f"\n[LIST] {self.agent_name}: Found {len(tasks)} pending task(s)")
                        
                        for task in tasks:
                            if not self._running:
                                break
                            
                            await executor.process_task(task)
                    
                    # Wait for next cycle or shutdown
                    try:
                        await asyncio.wait_for(
                            self._shutdown_event.wait(),
                            timeout=self.poll_interval
                        )
                        # If we get here, shutdown was requested
                        break
                    except asyncio.TimeoutError:
                        # Normal timeout, continue polling
                        pass
                        
                except Exception as e:
                    print(f"[ERR] {self.agent_name} worker error: {str(e)}")
                    # Don't crash - wait and retry
                    await asyncio.sleep(self.poll_interval)
        
        print(f"[STOP] Worker loop stopped: {self.agent_name}")
    
    def stop(self):
        """Signal the worker to stop after current task"""
        print(f"[STOP] Stopping worker: {self.agent_name}")
        self._running = False
        self._shutdown_event.set()


# ============================================
# Multi-Agent Worker Manager
# ============================================

class WorkerManager:
    """
    Manages multiple agent worker loops.
    
    Provides:
    - Start/stop all workers
    - Graceful shutdown
    - Periodic timeout cleanup
    """
    
    def __init__(
        self,
        poll_interval: int = DEFAULT_POLL_INTERVAL,
        timeout_check_interval: int = 300  # 5 minutes
    ):
        self.poll_interval = poll_interval
        self.timeout_check_interval = timeout_check_interval
        self._workers: dict[str, AgentWorkerLoop] = {}
        self._tasks: Set[asyncio.Task] = set()
        self._running = False
    
    async def start_all(self, agent_names: Optional[list[str]] = None):
        """
        Start worker loops for specified agents.
        
        Args:
            agent_names: List of agent names to start. 
                        If None, starts all registered agents.
        """
        registry = get_registry()
        
        if agent_names is None:
            agent_names = registry.list_agents()
        
        print(f"\n{'='*50}")
        print("AGENT WORKER MANAGER")
        print(f"{'='*50}")
        print(f"Starting workers for: {agent_names}")
        
        self._running = True
        
        # Create worker loops
        for agent_name in agent_names:
            if not registry.is_registered(agent_name):
                print(f"[WARN] Skipping unregistered agent: {agent_name}")
                continue
            
            worker = AgentWorkerLoop(
                agent_name=agent_name,
                poll_interval=self.poll_interval
            )
            self._workers[agent_name] = worker
            
            # Start as asyncio task
            task = asyncio.create_task(worker.start())
            self._tasks.add(task)
            task.add_done_callback(self._tasks.discard)
        
        # Start timeout cleanup task
        cleanup_task = asyncio.create_task(self._timeout_cleanup_loop())
        self._tasks.add(cleanup_task)
        cleanup_task.add_done_callback(self._tasks.discard)
        
        print(f"\n[OK] Started {len(self._workers)} worker(s)")
        print(f"{'='*50}\n")
    
    async def _timeout_cleanup_loop(self):
        """Periodically clean up timed-out tasks"""
        while self._running:
            try:
                await asyncio.sleep(self.timeout_check_interval)
                
                if not self._running:
                    break
                
                async with TaskExecutor() as executor:
                    timed_out = await executor.timeout_stale_tasks(TASK_TIMEOUT_MINUTES)
                    if timed_out > 0:
                        print(f"[TIMEOUT] Cleaned up {timed_out} timed-out task(s)")
                        
            except Exception as e:
                print(f"[ERR] Timeout cleanup error: {str(e)}")
    
    async def stop_all(self):
        """Stop all worker loops gracefully"""
        print(f"\n[STOP] Stopping all workers...")
        self._running = False
        
        # Signal all workers to stop
        for worker in self._workers.values():
            worker.stop()
        
        # Wait for all tasks to complete
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        
        self._workers.clear()
        self._tasks.clear()
        
        print("[OK] All workers stopped")
    
    async def run_forever(self, agent_names: Optional[list[str]] = None):
        """
        Start workers and run until interrupted.
        
        Sets up signal handlers for graceful shutdown.
        """
        await self.start_all(agent_names)
        
        # Wait for all worker tasks
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)


# ============================================
# Convenience Functions
# ============================================

async def run_worker_for_agent(agent_name: str, poll_interval: int = DEFAULT_POLL_INTERVAL):
    """
    Run a single agent worker loop.
    
    Args:
        agent_name: Name of the agent
        poll_interval: Seconds between polls
    """
    worker = AgentWorkerLoop(agent_name, poll_interval)
    
    # Handle Ctrl+C gracefully
    loop = asyncio.get_event_loop()
    
    def signal_handler():
        worker.stop()
    
    try:
        loop.add_signal_handler(signal.SIGINT, signal_handler)
        loop.add_signal_handler(signal.SIGTERM, signal_handler)
    except NotImplementedError:
        # Windows doesn't support add_signal_handler
        pass
    
    await worker.start()


async def run_all_workers(poll_interval: int = DEFAULT_POLL_INTERVAL):
    """
    Run worker loops for all registered agents.
    
    Args:
        poll_interval: Seconds between polls
    """
    manager = WorkerManager(poll_interval=poll_interval)
    
    # Handle Ctrl+C gracefully
    loop = asyncio.get_event_loop()
    
    async def signal_handler():
        await manager.stop_all()
    
    try:
        loop.add_signal_handler(signal.SIGINT, lambda: asyncio.create_task(signal_handler()))
        loop.add_signal_handler(signal.SIGTERM, lambda: asyncio.create_task(signal_handler()))
    except NotImplementedError:
        # Windows doesn't support add_signal_handler
        pass
    
    await manager.run_forever()


# ============================================
# CLI Entry Point
# ============================================

def main():
    """
    CLI entry point for running agent workers.
    
    Usage:
        python -m app.agents.worker_loop
        python -m app.agents.worker_loop --agent ResumeIntelligenceAgent
    """
    import argparse
    
    parser = argparse.ArgumentParser(description="Run NAVIYA agent workers")
    parser.add_argument(
        "--agent", "-a",
        help="Specific agent to run (runs all if not specified)"
    )
    parser.add_argument(
        "--interval", "-i",
        type=int,
        default=DEFAULT_POLL_INTERVAL,
        help=f"Poll interval in seconds (default: {DEFAULT_POLL_INTERVAL})"
    )
    
    args = parser.parse_args()
    
    print(f"\n{'='*50}")
    print("NAVIYA Agent Worker System")
    print(f"{'='*50}\n")
    
    if args.agent:
        print(f"Running single agent: {args.agent}")
        asyncio.run(run_worker_for_agent(args.agent, args.interval))
    else:
        print("Running all agents")
        asyncio.run(run_all_workers(args.interval))


if __name__ == "__main__":
    main()
