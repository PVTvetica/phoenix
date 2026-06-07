
import React, { useCallback, useEffect, useState } from 'react';
import EmptyState from '../../shared/ui/EmptyState';
import nextcloudDeckService, {
    DeckBoard,
    DeckCard,
    DeckStack,
    DeckStatus,
    DeckUrlStyle,
} from '../../../services/nextcloudDeckService';
import NextcloudCardFormModal, { CardFormMode } from './NextcloudCardFormModal';
import {
    boardColorStyle,
    buildDeckBoardOpenUrl,
    buildDeckCardOpenUrl,
    formatDeckDueDate,
} from './nextcloudDeckUtils';

interface Props {
    serverUrl?: string;
    canManage: boolean;
    active: boolean;
}

const NextcloudDecksTab: React.FC<Props> = ({ serverUrl, canManage, active }) => {
    const [deckStatus, setDeckStatus] = useState<DeckStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [boards, setBoards] = useState<DeckBoard[]>([]);
    const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
    const [stacks, setStacks] = useState<DeckStack[]>([]);
    const [cardsByStack, setCardsByStack] = useState<Record<number, DeckCard[]>>({});
    const [loadingBoard, setLoadingBoard] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<CardFormMode>('create');
    const [formStackId, setFormStackId] = useState<number | null>(null);
    const [editingCard, setEditingCard] = useState<DeckCard | null>(null);
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const urlStyle: DeckUrlStyle | undefined = deckStatus?.urlStyle;

    const loadDeckStatus = useCallback(async () => {
        setStatusLoading(true);
        setLoadError(null);
        try {
            const s = await nextcloudDeckService.getStatus();
            setDeckStatus(s);
            if (s.available) {
                const b = await nextcloudDeckService.getBoards();
                setBoards(b);
                if (b.length > 0) {
                    setSelectedBoardId((prev) => (prev && b.some(x => x.id === prev) ? prev : b[0].id));
                }
            }
        } catch {
            setDeckStatus({ configured: true, available: false, error: 'Deck-Integration nicht verfügbar' });
        } finally {
            setStatusLoading(false);
        }
    }, []);

    const loadBoardData = useCallback(async (boardId: number) => {
        setLoadingBoard(true);
        setLoadError(null);
        try {
            const stackList = await nextcloudDeckService.getStacks(boardId);
            setStacks(stackList);
            const cardEntries = await Promise.all(
                stackList.map(async (stack) => {
                    const cards = await nextcloudDeckService.getCards(boardId, stack.id);
                    return [stack.id, cards] as const;
                }),
            );
            const map: Record<number, DeckCard[]> = {};
            for (const [sid, cards] of cardEntries) map[sid] = cards;
            setCardsByStack(map);
        } catch (e) {
            setStacks([]);
            setCardsByStack({});
            setLoadError(e instanceof Error ? e.message : 'Board konnte nicht geladen werden.');
        } finally {
            setLoadingBoard(false);
        }
    }, []);

    useEffect(() => {
        if (active) void loadDeckStatus();
    }, [active, loadDeckStatus]);

    useEffect(() => {
        if (active && selectedBoardId != null && deckStatus?.available) {
            void loadBoardData(selectedBoardId);
        }
    }, [active, selectedBoardId, deckStatus?.available, loadBoardData]);

    const refreshBoard = () => {
        if (selectedBoardId != null) void loadBoardData(selectedBoardId);
    };

    const openCreateModal = (stackId?: number) => {
        setFormMode('create');
        setEditingCard(null);
        setFormStackId(stackId ?? stacks[0]?.id ?? null);
        setFormError(null);
        setFormOpen(true);
    };

    const openEditModal = (card: DeckCard) => {
        setFormMode('edit');
        setEditingCard(card);
        setFormStackId(card.stackId);
        setFormError(null);
        setFormOpen(true);
    };

    const buildCardPayload = (data: { title: string; description: string; dueDate: string }) => {
        const payload: {
            title: string;
            description?: string;
            dueDate?: string | null;
        } = { title: data.title };
        if (data.description) payload.description = data.description;
        if (data.dueDate) {
            payload.dueDate = new Date(data.dueDate).toISOString();
        } else if (formMode === 'edit') {
            payload.dueDate = null;
        }
        return payload;
    };

    const handleFormSubmit = async (data: { stackId: number; title: string; description: string; dueDate: string }) => {
        if (selectedBoardId == null) return;
        setFormSaving(true);
        setFormError(null);
        try {
            const base = {
                boardId: selectedBoardId,
                stackId: data.stackId,
                ...buildCardPayload(data),
            };
            if (formMode === 'edit' && editingCard) {
                await nextcloudDeckService.updateCard(editingCard.id, base);
            } else {
                const createPayload = {
                    boardId: base.boardId,
                    stackId: base.stackId,
                    title: base.title,
                    description: base.description,
                    ...(typeof base.dueDate === 'string' ? { dueDate: base.dueDate } : {}),
                };
                await nextcloudDeckService.createCard(createPayload);
            }
            setFormOpen(false);
            refreshBoard();
        } catch (e) {
            setFormError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
        } finally {
            setFormSaving(false);
        }
    };

    const openCardInNextcloud = (card: DeckCard) => {
        const url = buildDeckCardOpenUrl(serverUrl, card.boardId, card.id, urlStyle);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    const openBoardInNextcloud = () => {
        if (selectedBoardId == null) return;
        const url = buildDeckBoardOpenUrl(serverUrl, selectedBoardId, urlStyle);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    if (statusLoading) {
        return (
            <div className="p-8 text-center text-slate-500 text-sm font-mono uppercase tracking-widest">
                <i className="fa-solid fa-circle-notch animate-spin mr-2" />Deck wird geladen…
            </div>
        );
    }

    if (!deckStatus?.available) {
        return (
            <EmptyState
                icon="fa-layer-group"
                heading="Deck-Integration nicht verfügbar"
                description={deckStatus?.error ?? 'Nextcloud Deck ist nicht erreichbar oder nicht installiert.'}
                accent="purple"
            />
        );
    }

    const selectedBoard = boards.find(b => b.id === selectedBoardId);

    return (
        <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Board</label>
                    <select
                        value={selectedBoardId ?? ''}
                        onChange={(e) => setSelectedBoardId(Number(e.target.value) || null)}
                        disabled={loadingBoard || boards.length === 0}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    >
                        {boards.map(b => (
                            <option key={b.id} value={b.id}>{b.title}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-end gap-2 ml-auto">
                    {canManage && stacks.length > 0 && (
                        <button
                            type="button"
                            onClick={() => openCreateModal()}
                            className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-200 hover:bg-purple-600/30"
                        >
                            <i className="fa-solid fa-plus mr-1" />Neue Karte
                        </button>
                    )}
                    {selectedBoardId != null && (
                        <button
                            type="button"
                            onClick={openBoardInNextcloud}
                            className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
                        >
                            <i className="fa-solid fa-arrow-up-right-from-square mr-1" />In Nextcloud öffnen
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={refreshBoard}
                        disabled={loadingBoard || selectedBoardId == null}
                        className="p-2 text-slate-400 hover:text-slate-200 disabled:opacity-40"
                        title="Aktualisieren"
                    >
                        <i className={`fa-solid fa-rotate-right ${loadingBoard ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loadError && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{loadError}</div>
            )}

            {loadingBoard ? (
                <div className="p-8 text-center text-slate-500 text-sm font-mono uppercase tracking-widest">
                    <i className="fa-solid fa-circle-notch animate-spin mr-2" />Spalten laden…
                </div>
            ) : stacks.length === 0 ? (
                <EmptyState
                    icon="fa-columns"
                    heading="Keine Spalten"
                    description={selectedBoard ? `Board „${selectedBoard.title}" hat keine Stacks.` : 'Wähle ein Board.'}
                    accent="purple"
                />
            ) : (
                <div className="overflow-x-auto pb-2">
                    <div className="flex gap-4 min-w-min">
                        {stacks.map(stack => {
                            const cards = cardsByStack[stack.id] ?? [];
                            const colorStyle = boardColorStyle(selectedBoard?.color);
                            return (
                                <div
                                    key={stack.id}
                                    className="w-72 shrink-0 flex flex-col bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden border-t-4 border-t-purple-500/50"
                                    style={colorStyle}
                                >
                                    <div className="px-3 py-2.5 border-b border-slate-800/80 flex items-center justify-between gap-2">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-200 truncate">{stack.title}</h3>
                                        <span className="text-[10px] font-mono text-slate-500 shrink-0">{cards.length}</span>
                                    </div>
                                    <div className="flex-1 p-2 space-y-2 min-h-[120px] max-h-[60vh] overflow-y-auto">
                                        {cards.length === 0 ? (
                                            <p className="text-xs text-slate-600 text-center py-6">Keine Karten</p>
                                        ) : (
                                            cards.map(card => {
                                                const due = formatDeckDueDate(card.dueDate);
                                                return (
                                                    <div
                                                        key={card.id}
                                                        className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 hover:border-purple-500/30 transition-colors"
                                                    >
                                                        <p className="text-sm font-medium text-slate-100 break-words">{card.title}</p>
                                                        {card.description && (
                                                            <p className="text-xs text-slate-500 mt-1 line-clamp-3 break-words">{card.description}</p>
                                                        )}
                                                        {due && (
                                                            <p className="text-[10px] text-amber-400/90 mt-2 font-mono">
                                                                <i className="fa-regular fa-calendar mr-1" />{due}
                                                            </p>
                                                        )}
                                                        <div className="flex justify-end gap-1 mt-2">
                                                            {canManage && (
                                                                <button
                                                                    type="button"
                                                                    title="Bearbeiten"
                                                                    onClick={() => openEditModal(card)}
                                                                    className="p-1.5 text-slate-500 hover:text-purple-300 rounded"
                                                                >
                                                                    <i className="fa-solid fa-pen text-[10px]" />
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                title="In Nextcloud öffnen"
                                                                onClick={() => openCardInNextcloud(card)}
                                                                className="p-1.5 text-slate-500 hover:text-purple-300 rounded"
                                                            >
                                                                <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    {canManage && (
                                        <div className="p-2 border-t border-slate-800/80">
                                            <button
                                                type="button"
                                                onClick={() => openCreateModal(stack.id)}
                                                className="w-full text-[10px] font-bold uppercase tracking-widest py-2 text-slate-500 hover:text-purple-300 hover:bg-slate-800/50 rounded-lg transition-colors"
                                            >
                                                <i className="fa-solid fa-plus mr-1" />Karte
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <NextcloudCardFormModal
                isOpen={formOpen}
                mode={formMode}
                onClose={() => !formSaving && setFormOpen(false)}
                stacks={stacks}
                defaultStackId={formStackId}
                boardId={selectedBoardId ?? 0}
                initialCard={editingCard}
                onSubmit={handleFormSubmit}
                saving={formSaving}
                error={formError}
            />
        </div>
    );
};

export default NextcloudDecksTab;
