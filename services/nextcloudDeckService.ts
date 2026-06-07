import apiService from './apiService';
import type {
    CreateDeckCardPayload,
    CreateDeckCardResult,
    DeckBoard,
    DeckCard,
    DeckStack,
    DeckStatus,
    UpdateDeckCardPayload,
    UpdateDeckCardResult,
} from './nextcloudDeckTypes';

export type {
    CreateDeckCardPayload,
    CreateDeckCardResult,
    DeckBoard,
    DeckCard,
    DeckStack,
    DeckStatus,
    DeckUrlStyle,
    UpdateDeckCardPayload,
    UpdateDeckCardResult,
} from './nextcloudDeckTypes';

class NextcloudDeckService {
    async getStatus(): Promise<DeckStatus> {
        return apiService.getDeckStatus();
    }

    async getBoards(): Promise<DeckBoard[]> {
        const res = await apiService.getDeckBoards();
        return res.boards;
    }

    async getStacks(boardId: number): Promise<DeckStack[]> {
        const res = await apiService.getDeckStacks(boardId);
        return res.stacks;
    }

    async getCards(boardId: number, stackId: number): Promise<DeckCard[]> {
        const res = await apiService.getDeckCards(boardId, stackId);
        return res.cards;
    }

    async createCard(payload: CreateDeckCardPayload): Promise<CreateDeckCardResult> {
        return apiService.createDeckCard(payload);
    }

    async updateCard(cardId: number, payload: UpdateDeckCardPayload): Promise<UpdateDeckCardResult> {
        return apiService.updateDeckCard(cardId, payload);
    }
}

export const nextcloudDeckService = new NextcloudDeckService();
export default nextcloudDeckService;
