"""
Display utilities for domain-agnostic resume analysis output.
"""


def pretty_print_analysis(data: dict) -> None:
    """Print domain-agnostic resume analysis in a human-readable format."""

    def section(title: str):
        print(f"\n{'='*70}")
        print(f"  {title}")
        print(f"{'='*70}")

    # --- Contact Info ---
    contact = data.get("contact_info") or {}
    if any(contact.values()):
        section("CONTACT INFORMATION")
        for key, val in contact.items():
            if val:
                label = key.replace("_", " ").title()
                print(f"  {label}: {val}")

    # --- Professional Context ---
    context = data.get("professional_context") or {}
    if any(context.values()):
        section("PROFESSIONAL CONTEXT")
        if context.get("primary_role_category"):
            print(f"  Primary Role: {context['primary_role_category']}")
        if context.get("industry_domain"):
            print(f"  Industry: {context['industry_domain']}")
        if context.get("seniority_level"):
            print(f"  Seniority: {context['seniority_level']}")
        if context.get("years_of_experience"):
            print(f"  Experience: {context['years_of_experience']} years")
        if context.get("current_position"):
            print(f"  Current Position: {context['current_position']}")
        if context.get("career_summary"):
            print(f"\n  Summary:")
            print(f"    {context['career_summary']}")

    # --- Capabilities ---
    capabilities = data.get("capabilities") or {}
    if any(capabilities.values()):
        section("CAPABILITIES ANALYSIS")
        
        core = capabilities.get("core_competencies") or []
        if core:
            print(f"\n  Core Competencies:")
            for comp in core:
                cap = comp.get("capability", "")
                norm = comp.get("normalized_label", "")
                evidence = comp.get("evidence_source", "")
                print(f"    • {cap}")
                if norm and norm != cap:
                    print(f"      Normalized: {norm}")
                if evidence:
                    print(f"      Evidence: {evidence}")
        
        domain = capabilities.get("domain_expertise") or []
        if domain:
            print(f"\n  Domain Expertise: {', '.join(domain)}")
        
        transferable = capabilities.get("transferable_skills") or []
        if transferable:
            print(f"  Transferable Skills: {', '.join(transferable)}")
        
        technical = capabilities.get("technical_proficiencies") or []
        if technical:
            print(f"  Technical Proficiencies: {', '.join(technical)}")
        
        soft = capabilities.get("soft_skills_demonstrated") or []
        if soft:
            print(f"  Soft Skills: {', '.join(soft)}")

    # --- Experience Analysis ---
    experience = data.get("experience_analysis") or []
    if experience:
        section("EXPERIENCE ANALYSIS")
        for i, exp in enumerate(experience, 1):
            role = exp.get("role", "")
            org = exp.get("organization", "")
            duration = exp.get("duration", "")
            scope = exp.get("responsibility_scope", "")
            leadership = exp.get("leadership_level", "")
            
            print(f"\n  {i}. {role} @ {org}")
            if duration:
                print(f"     Duration: {duration}")
            if scope:
                print(f"     Scope: {scope}")
            if leadership:
                print(f"     Leadership Level: {leadership}")
            
            actions = exp.get("actions_performed") or []
            if actions:
                print(f"     Actions:")
                for action in actions[:5]:  # Limit to first 5
                    print(f"       • {action}")
            
            impact = exp.get("impact_and_outcomes") or {}
            quant = impact.get("quantitative_results") or []
            qual = impact.get("qualitative_impact") or []
            
            if quant:
                print(f"     Quantitative Impact:")
                for q in quant:
                    print(f"       ▸ {q}")
            if qual:
                print(f"     Qualitative Impact:")
                for q in qual:
                    print(f"       ▸ {q}")
            
            tools = exp.get("tools_and_methods_used") or []
            if tools:
                print(f"     Tools/Methods: {', '.join(tools[:8])}")

    # --- Education ---
    education = data.get("education") or []
    if education:
        section("EDUCATION")
        for i, edu in enumerate(education, 1):
            degree = edu.get("degree", "")
            field = edu.get("field_of_study", "")
            inst = edu.get("institution", "")
            grad_date = edu.get("graduation_date", "")
            
            print(f"  {i}. {degree} in {field}" if field else f"  {i}. {degree}")
            if inst:
                print(f"     {inst}")
            if grad_date:
                print(f"     Graduated: {grad_date}")
            
            honors = edu.get("honors_distinctions") or []
            for h in honors:
                print(f"     ★ {h}")
            
            research = edu.get("research_focus", "")
            if research:
                print(f"     Research: {research}")

    # --- Growth & Progression ---
    growth = data.get("growth_and_progression") or {}
    if any(growth.values()):
        section("GROWTH & PROGRESSION")
        
        if growth.get("career_trajectory"):
            print(f"  Trajectory: {growth['career_trajectory']}")
        if growth.get("role_progression_pattern"):
            print(f"  Progression Pattern: {growth['role_progression_pattern']}")
        if growth.get("breadth_vs_depth"):
            print(f"  Profile Type: {growth['breadth_vs_depth']}")
        
        evolution = growth.get("skill_evolution") or []
        if evolution:
            print(f"\n  Skill Evolution:")
            for skill in evolution:
                print(f"    • {skill}")
        
        learning = growth.get("learning_signals") or []
        if learning:
            print(f"\n  Learning Signals:")
            for signal in learning:
                print(f"    ✓ {signal}")
        
        specialization = growth.get("specialization_areas") or []
        if specialization:
            print(f"\n  Specializations: {', '.join(specialization)}")

    # --- Professional Maturity Signals ---
    maturity = data.get("professional_maturity_signals") or {}
    if any(maturity.values()):
        section("PROFESSIONAL MATURITY SIGNALS")
        
        for key, val in maturity.items():
            if val:
                label = key.replace("_", " ").title()
                if isinstance(val, list):
                    print(f"\n  {label}:")
                    for item in val:
                        print(f"    • {item}")
                else:
                    print(f"  {label}: {val}")

    # --- Projects & Initiatives ---
    projects = data.get("projects_and_initiatives") or []
    if projects:
        section("PROJECTS & INITIATIVES")
        for i, proj in enumerate(projects, 1):
            name = proj.get("name", "")
            desc = proj.get("description", "")
            role = proj.get("role_and_contribution", "")
            
            print(f"  {i}. {name}")
            if desc:
                print(f"     {desc}")
            if role:
                print(f"     Role: {role}")
            
            methods = proj.get("methods_and_tools") or []
            if methods:
                print(f"     Methods/Tools: {', '.join(methods)}")
            
            outcomes = proj.get("outcomes") or []
            for outcome in outcomes:
                print(f"     → {outcome}")

    # --- Certifications ---
    certs = data.get("certifications_and_credentials") or []
    if certs:
        section("CERTIFICATIONS & CREDENTIALS")
        for i, cert in enumerate(certs, 1):
            cred = cert.get("credential", "")
            issuer = cert.get("issuing_body", "")
            date = cert.get("date_obtained", "")
            relevance = cert.get("relevance_to_role", "")
            
            print(f"  {i}. {cred}")
            if issuer:
                print(f"     Issued by: {issuer}")
            if date:
                print(f"     Date: {date}")
            if relevance:
                print(f"     Relevance: {relevance}")

    # --- Publications ---
    pubs = data.get("publications_and_thought_leadership") or []
    if pubs:
        section("PUBLICATIONS & THOUGHT LEADERSHIP")
        for i, pub in enumerate(pubs, 1):
            title = pub.get("title", "")
            pub_type = pub.get("type", "")
            venue = pub.get("venue", "")
            date = pub.get("date", "")
            print(f"  {i}. {title}")
            if pub_type:
                print(f"     Type: {pub_type}")
            if venue:
                print(f"     Venue: {venue}")
            if date:
                print(f"     Date: {date}")

    # --- Awards ---
    awards = data.get("awards_and_recognition") or []
    if awards:
        section("AWARDS & RECOGNITION")
        for i, award in enumerate(awards, 1):
            name = award.get("award", "")
            org = award.get("granting_organization", "")
            date = award.get("date", "")
            significance = award.get("significance", "")
            print(f"  {i}. {name}")
            if org:
                print(f"     From: {org} ({date})" if date else f"     From: {org}")
            if significance:
                print(f"     Significance: {significance}")

    # --- Additional Context ---
    additional = data.get("additional_context") or {}
    if any(additional.values()):
        section("ADDITIONAL CONTEXT")
        
        volunteer = additional.get("volunteer_and_community") or []
        if volunteer:
            print(f"\n  Volunteer & Community:")
            for v in volunteer:
                print(f"    • {v}")
        
        languages = additional.get("languages") or []
        if languages:
            print(f"\n  Languages: {', '.join(languages)}")
        
        if additional.get("geographic_mobility"):
            print(f"\n  Geographic Mobility: {additional['geographic_mobility']}")
        
        gaps = additional.get("career_gaps_explained") or []
        if gaps:
            print(f"\n  Career Context:")
            for gap in gaps:
                print(f"    • {gap}")
