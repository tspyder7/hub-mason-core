import { MemoryStore } from '@/src/lifecycle/store/memory-store';
import { createStep } from '@/tests/fixtures/steps';

describe('MemoryStore', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('get', () => {
        it('returns empty array by default', () => {
            const store = new MemoryStore<'pending' | 'done'>();
            const result = store.get();
            expect(result).toEqual([]);
        });

        it('returns initial steps', () => {
            const initial = [createStep<'pending' | 'done'>()];
            const store = new MemoryStore(initial);
            expect(store.get()).toEqual(initial);
        });

        it('copies initial array so external mutation does not leak', () => {
            const initial = [createStep<'pending' | 'done'>()];
            const store = new MemoryStore(initial);

            initial.push(
                createStep<'pending' | 'done'>({
                    id: 'step-2',
                    name: 'Step 2',
                }),
            );

            expect(store.get()).toHaveLength(1);
        });
    });

    describe('set', () => {
        it('replaces steps via updater', () => {
            const store = new MemoryStore<'pending' | 'done'>([
                createStep<'pending' | 'done'>(),
            ]);

            store.set((prev) =>
                prev.map((s) => ({ ...s, status: 'done' as const })),
            );

            expect(store.get()[0]?.status).toBe('done');
        });

        it('notifies subscribers on set', () => {
            const store = new MemoryStore<'pending' | 'done'>([
                createStep<'pending' | 'done'>(),
            ]);
            const listener = vi.fn();

            store.subscribe(listener);

            store.set((prev) => [...prev]);

            expect(listener).toHaveBeenCalledOnce();
            expect(listener).toHaveBeenCalledWith(store.get());
        });

        it('notifies multiple subscribers', () => {
            const store = new MemoryStore<'pending' | 'done'>();
            const first = vi.fn();
            const second = vi.fn();

            store.subscribe(first);
            store.subscribe(second);

            store.set(() => [createStep<'pending' | 'done'>()]);

            expect(first).toHaveBeenCalledOnce();
            expect(second).toHaveBeenCalledOnce();
        });
    });

    describe('subscribe', () => {
        it('stops notifying after unsubscribe', () => {
            const store = new MemoryStore<'pending' | 'done'>();
            const listener = vi.fn();
            const unsubscribe = store.subscribe(listener);

            unsubscribe();
            store.set(() => [createStep<'pending' | 'done'>()]);

            expect(listener).not.toHaveBeenCalled();
        });

        it('returns unsubscribe function', () => {
            const store = new MemoryStore<'pending' | 'done'>();
            const unsubscribe = store.subscribe(vi.fn());
            expect(typeof unsubscribe).toBe('function');
        });
    });
});
