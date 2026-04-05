
export interface PlanSection {
    title: string;
    content: string;
}

export interface Plan {
    analysis: PlanSection;
    flows: PlanSection;
    stack: PlanSection;
    implementation: PlanSection;
    roi: PlanSection;
    timeline: PlanSection;
    skills: PlanSection;
    skillConfig?: string; // JSON configuration for the skill
}

export interface SavedPlan {
    id: string;
    name: string;
    timestamp: number;
    businessDescription: string;
    plan: Plan;
    sources: GroundingSource[];
}

export type LeadStatus = 'new' | 'contacted' | 'negotiating' | 'closed' | 'lost';

export interface Lead {
    id: string;
    name: string;
    email: string;
    company: string;
    businessDescription: string;
    plan: Plan;
    sources: GroundingSource[];
    timestamp: number;
    status: LeadStatus;
    notes?: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

export interface GroundingSource {
    uri: string;
    title: string;
}
