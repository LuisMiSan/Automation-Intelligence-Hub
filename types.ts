
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
}

export interface SavedPlan {
    id: string;
    name: string;
    timestamp: number;
    businessDescription: string;
    plan: Plan;
    sources: GroundingSource[];
}

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

export interface GroundingSource {
    uri: string;
    title: string;
}
