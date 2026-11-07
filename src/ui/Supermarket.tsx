import React, { useState } from 'react';
import { CreditCard, ShoppingBasket, ShoppingCart, Wallet, X } from 'lucide-react';
import {
  SUPERMARKET_PRODUCTS,
  SupermarketPaymentMethod,
  useGameStore
} from '../core/gameState';
import { audioManager } from '../core/AudioManager';

export const Supermarket: React.FC = () => {
  const isOpen = useGameStore((state) => state.supermarketOpen);
  const cash = useGameStore((state) => state.cash);
  const cart = useGameStore((state) => state.supermarketCart);
  const closeSupermarket = useGameStore((state) => state.closeSupermarket);
  const removeProduct = useGameStore((state) => state.removeSupermarketProduct);
  const checkout = useGameStore((state) => state.checkoutSupermarket);
  const [paymentMethod, setPaymentMethod] = useState<SupermarketPaymentMethod>('cash');

  const total = SUPERMARKET_PRODUCTS.reduce(
    (sum, product) => sum + product.price * (cart[product.id] ?? 0),
    0
  );
  const itemCount = Object.values(cart).reduce((sum, quantity) => sum + (quantity ?? 0), 0);

  if (!isOpen) return null;

  const handleCheckout = () => {
    if (checkout(paymentMethod)) audioManager.playCashRegister();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm pointer-events-auto"
      onKeyDown={(event) => {
        if (event.key === 'Escape') closeSupermarket();
      }}
    >
      <section className="w-full max-w-3xl overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-950 text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 bg-emerald-950/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <ShoppingBasket className="h-6 w-6 text-emerald-400" />
            <div>
              <h2 className="font-game text-lg font-black tracking-wide">VICE BAY FRESH MARKET</h2>
              <p className="text-xs text-slate-400">Checkout · {itemCount} item{itemCount === 1 ? '' : 's'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSupermarket}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close supermarket checkout"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-5 p-5 md:grid-cols-[1fr_260px]">
          <div className="space-y-2">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Your basket</h3>
            {itemCount === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
                Your basket is empty. Use [F] beside an aisle shelf to pick up groceries.
              </div>
            ) : (
              SUPERMARKET_PRODUCTS.filter((product) => (cart[product.id] ?? 0) > 0).map((product) => {
                const quantity = cart[product.id] ?? 0;
                return (
                  <div key={product.id} className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: `#${product.color.toString(16).padStart(6, '0')}` }} />
                      <div>
                        <div className="text-sm font-semibold">{product.name}</div>
                        <div className="text-xs text-slate-500">{product.description} · ${product.price} · Qty {quantity}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      className="rounded-md px-2 py-1 text-xs text-rose-300 hover:bg-rose-950/60"
                    >
                      Remove one
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <aside className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Total</span>
              <strong className="font-mono text-lg text-white">${total}</strong>
            </div>
            <div className="mt-1 text-xs text-slate-500">Available funds: ${cash.toLocaleString()}</div>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex w-full items-center gap-2 rounded-lg border p-2.5 text-sm ${paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-950/50 text-emerald-200' : 'border-slate-700 text-slate-400'}`}
              >
                <Wallet className="h-4 w-4" /> Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex w-full items-center gap-2 rounded-lg border p-2.5 text-sm ${paymentMethod === 'card' ? 'border-sky-500 bg-sky-950/50 text-sky-200' : 'border-slate-700 text-slate-400'}`}
              >
                <CreditCard className="h-4 w-4" /> Bank card
              </button>
              <button
                type="button"
                disabled={total === 0}
                onClick={handleCheckout}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingCart className="h-4 w-4" /> Pay ${total}
              </button>
            </div>
          </aside>
        </div>
        <footer className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500">
          Press Escape or close the window to return to the shop.
        </footer>
      </section>
    </div>
  );
};
