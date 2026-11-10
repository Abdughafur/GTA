import React from 'react';
import { Check, Crosshair, PackagePlus, Shield, ShoppingCart, Zap } from 'lucide-react';
import { AMMO_PACKS, useGameStore } from '../../core/gameState';
import { audioManager } from '../../core/AudioManager';

const ammoCatalog = [
  {
    id: 'pistol',
    name: '9mm pistol rounds',
    weapon: '9mm Combat Pistol',
    icon: <Crosshair className="h-5 w-5" />,
    color: 'ammo-accent-blue',
    ...AMMO_PACKS.pistol,
  },
  {
    id: 'smg',
    name: '9mm SMG rounds',
    weapon: 'Micro SMG 9mm',
    icon: <Zap className="h-5 w-5" />,
    color: 'ammo-accent-violet',
    ...AMMO_PACKS.smg,
  },
  {
    id: 'rifle',
    name: '5.56 rifle rounds',
    weapon: 'Assault Carbine',
    icon: <Shield className="h-5 w-5" />,
    color: 'ammo-accent-amber',
    ...AMMO_PACKS.rifle,
  }
] as const;

export const PhoneAmmo: React.FC = () => {
  const cash = useGameStore((state) => state.cash);
  const weapons = useGameStore((state) => state.weapons);
  const purchaseAmmo = useGameStore((state) => state.purchaseAmmo);
  const showNotification = useGameStore((state) => state.showNotification);

  const handlePurchase = (weapon: (typeof ammoCatalog)[number]['id']) => {
    const result = purchaseAmmo(weapon);
    if (result === 'success') {
      const pack = AMMO_PACKS[weapon];
      audioManager.playCashRegister();
      showNotification(`Ammo delivered: +${pack.quantity} rounds.`);
    } else if (result === 'insufficient-funds') {
      showNotification('Not enough cash to buy this ammo pack.');
    } else {
      showNotification('Ammo reserve is full. Use some rounds first.');
    }
  };

  return (
    <div className="ammo-store">
      <header className="ammo-store-header">
        <div className="ammo-store-title-row">
          <div className="ammo-store-mark"><Crosshair aria-hidden="true" /></div>
          <div>
            <div className="ammo-store-eyebrow">VICE BAY SUPPLY</div>
            <h1>Ammo store</h1>
          </div>
        </div>
        <div className="ammo-wallet">
          <span>AVAILABLE CASH</span>
          <strong>${cash.toLocaleString()}</strong>
        </div>
      </header>

      <div className="ammo-store-content phone-scroll">
        <div className="ammo-store-banner">
          <div className="ammo-banner-icon"><PackagePlus aria-hidden="true" /></div>
          <div>
            <strong>Quick restock</strong>
            <p>Fresh ammunition delivered straight to your inventory.</p>
          </div>
        </div>

        <div className="ammo-section-label">
          <span>AMMUNITION</span>
          <span>3 PACKS</span>
        </div>

        {ammoCatalog.map((item) => {
          const weapon = weapons[item.id];
          const reserveLimit = weapon.maxClip * 20;
          const reserveFull = weapon.reserve + item.quantity > reserveLimit;
          const canAfford = cash >= item.price;

          return (
            <article className={`ammo-product ${item.color}`} key={item.id}>
              <div className="ammo-product-top">
                <div className="ammo-product-icon">{item.icon}</div>
                <div className="ammo-product-info">
                  <h2>{item.name}</h2>
                  <p>{item.weapon}</p>
                </div>
                <strong className="ammo-price">${item.price}</strong>
              </div>

              <div className="ammo-reserve">
                <div className="ammo-reserve-label">
                  <span>SPARE AMMO</span>
                  <span>{weapon.reserve} <i>/ {reserveLimit}</i></span>
                </div>
                <div className="ammo-reserve-track">
                  <span style={{ width: `${Math.min(100, (weapon.reserve / reserveLimit) * 100)}%` }} />
                </div>
              </div>

              <div className="ammo-product-footer">
                <span className="ammo-pack-quantity">+{item.quantity} rounds</span>
                <button
                  type="button"
                  className="ammo-buy-button"
                  onClick={() => handlePurchase(item.id)}
                  disabled={reserveFull || !canAfford}
                >
                  {reserveFull ? <Check aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}
                  {reserveFull ? 'Reserve full' : canAfford ? 'Buy pack' : 'Not enough cash'}
                </button>
              </div>
            </article>
          );
        })}
        <p className="ammo-store-footnote">Maximum reserve: 20 magazines per weapon.</p>
      </div>
    </div>
  );
};
