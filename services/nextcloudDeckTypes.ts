export type DeckUrlStyle = 'index.php' | 'pretty';

export interface DeckStatus {
    configured: boolean;
    available: boolean;
    urlStyle?: DeckUrlStyle;
    error?: string;
}

export interface DeckBoard {
    id: number;
    title: string;
    color?: string;
    archived: boolean;
}

export interface DeckStack {
    id: number;
    boardId: number;
    title: string;
    order: number;
}

export interface DeckCard {
    id: number;
    boardId: number;
    stackId: number;
    title: string;
    description?: string;
    dueDate?: string | null;
    order: number;
    archived: boolean;
}

export interface CreateDeckCardPayload {
    boardId: number;
    stackId: number;
    title: string;
    description?: string;
    dueDate?: string;
}

export interface CreateDeckCardResult {
    success: true;
    card: DeckCard;
}

export interface UpdateDeckCardPayload {
    boardId: number;
    stackId: number;
    title: string;
    description?: string;
    dueDate?: string | null;
}

export interface UpdateDeckCardResult {
    success: true;
    card: DeckCard;
}
