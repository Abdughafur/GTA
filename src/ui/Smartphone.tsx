import React from 'react';
import { useGameStore, PhoneAppType, JobType } from '../core/gameState';
import {
  Navigation,
  MessageSquare,
  Phone,
  Globe,
  Landmark,
  Settings,
  X,
  Wifi,
  Signal,
  Battery,
  Home,
  Briefcase,
  Car,
  Music,
  CloudSun,
  Camera,
  Zap,
  Crosshair
} from 'lucide-react';
import { PhoneMap } from './phone/PhoneMap';
import { PhoneMessages } from './phone/PhoneMessages';
import { PhoneContacts } from './phone/PhoneContacts';
import { PhoneBrowser } from './phone/PhoneBrowser';
import { PhoneBank } from './phone/PhoneBank';
import { PhoneSettings } from './phone/PhoneSettings';
import { PhoneJobs } from './phone/PhoneJobs';
import { PhoneGarage } from './phone/PhoneGarage';
import { PhoneMusic } from './phone/PhoneMusic';
import { PhoneWeather } from './phone/PhoneWeather';
import { PhoneCamera } from './phone/PhoneCamera';
import { PhoneAmmo } from './phone/PhoneAmmo';
import { audioManager } from '../core/AudioManager';

interface SmartphoneProps {
  onAcceptMission: (missionId: string) => void;
  onSpawnCar: (type: 'sports' | 'suv' | 'sedan' | 'taxi' | 'ambulance', colorHex: number) => void;
  onDispatchJob?: (job: JobType) => void;
}

export const Smartphone: React.FC<SmartphoneProps> = ({ onAcceptMission, onSpawnCar, onDispatchJob }) => {
  const isPhoneOpen = useGameStore((s) => s.isPhoneOpen);
  const closePhone = useGameStore((s) => s.closePhone);
  const activePhoneApp = useGameStore((s) => s.activePhoneApp);
  const setPhoneApp = useGameStore((s) => s.setPhoneApp);
  const unreadMessagesCount = useGameStore((s) => s.unreadMessagesCount);
  const activeMission = useGameStore((s) => s.activeMission);
  const activeJob = useGameStore((s) => s.activeJob);
  const phoneBattery = useGameStore((s) => s.phoneBattery);
  const isPhoneCharging = useGameStore((s) => s.isPhoneCharging);
  const isBatterySaver = useGameStore((s) => s.isBatterySaver);
  const wallpaper = useGameStore((s) => s.wallpaper);
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const weather = useGameStore((s) => s.weather);

  if (!isPhoneOpen) return null;

  // Format in-game 24h clock to digital 12h display
  const hours = Math.floor(timeOfDay);
  const mins = Math.floor((timeOfDay - hours) * 60);
  const formattedTime = `${hours % 12 === 0 ? 12 : hours % 12}:${mins < 10 ? '0' : ''}${mins}`;

  const appIcons = [
    {
      id: 'map' as PhoneAppType,
      name: 'Maps',
      icon: <Navigation className="w-5 h-5 text-white" />,
      color: 'bg-gradient-to-tr from-sky-600 to-sky-400',
      badge: activeMission ? '!' : null
    },
    {
      id: 'messages' as PhoneAppType,
      name: 'Messages',
      icon: <MessageSquare className="w-5 h-5 text-white" />,
      color: 'bg-gradient-to-tr from-emerald-600 to-emerald-400',
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null
    },
    {
      id: 'jobs' as PhoneAppType,
      name: 'Jobs',
      icon: <Briefcase className="w-5 h-5 text-white" />,
      color: 'bg-gradient-to-tr from-amber-600 to-amber-400',
      badge: activeJob !== 'none' ? 'ON' : null
    },
    {
      id: 'garage' as PhoneAppType,
      name: 'Garage',
      icon: <Car className="w-5 h-5 text-white" />,
      color: 'bg-gradient-to-tr from-rose-600 to-rose-400'
    },
    {
      id: 'music' as PhoneAppType,
      name: 'Music',
      icon: <Music className="w-5 h-5 text-white" />,
      color: 'bg-gradient-to-tr from-purple-600 to-indigo-500'
    },
    {
      id: 'weather' as PhoneAppType,
      name: 'Weather',
      icon: <CloudSun className="w-5 h-5 text-white" />,
      color: 'bg-gradient-to-tr from-cyan-600 to-sky-400'
    },
    {
      id: 'camera' as PhoneAppType,
      name: 'Camera',
      icon: <Camera className="w-5 h-5 text-white" />,
      color: 'bg-gradient-to-tr from-zinc-700 to-zinc-500'
    },
    {
      id: 'bank' as PhoneAppType,
      name: 'Maze Bank',
      icon: <Landmark className="w-5 h-5 text-white" />,
      color: 'bg-gradient-to-tr from-red-700 to-rose-500'
    },
    {
      id: 'ammo' as PhoneAppType,
      name: 'Ammu-Nation',
      icon: <Crosshair className="w-5 h-5 text-white" />,
      color: 'bg-gradient-to-tr from-lime-700 to-emerald-500'
    },
    {
      id: 'browser' as PhoneAppType,
      name: 'Safari',
      icon: <Globe className="w-5 h-5 text-white" />,
      color: 'bg-gradient-to-tr from-orange-600 to-amber-500'
    },
    {
      id: 'contacts' as PhoneAppType,
      name: 'Contacts',
      icon: <Phone className="w-5 h-5 text-white" />,
      color: 'bg-gradient-to-tr from-blue-600 to-blue-400'
    },
    {
      id: 'settings' as PhoneAppType,
      name: 'Settings',
      icon: <Settings className="w-5 h-5 text-white" />,
      color: 'bg-gradient-to-tr from-slate-600 to-slate-400'
    }
  ];

  const handleAppClick = (appId: PhoneAppType) => {
    setPhoneApp(appId);
    audioManager.playPhoneBeep();
  };

  const dockApps = appIcons.filter((app) =>
    ['map', 'contacts', 'messages', 'settings'].includes(app.id)
  );

  const handleHome = () => {
    setPhoneApp('home');
    audioManager.playPhoneBeep();
  };

  const handleClose = () => {
    closePhone();
    audioManager.playPhoneBeep();
  };

  return (
    <div className="ios-phone-anchor">
      <div className="ios-device" role="dialog" aria-label="BlockGTA smartphone">
        <div className="ios-screen">
          <div className="ios-statusbar">
            <span className="ios-status-time">{formattedTime}</span>
            <div
              className={`ios-dynamic-island ${
                isPhoneCharging || activeJob !== 'none' ? 'ios-dynamic-island-active' : ''
              }`}
              aria-label="Dynamic Island"
            >
              <span className="ios-island-camera" />
              {isPhoneCharging && <Zap className="ios-island-charge" />}
              {activeJob !== 'none' && <span className="ios-island-duty">DUTY</span>}
            </div>
            <div className="ios-status-icons">
              <Signal aria-hidden="true" />
              <Wifi aria-hidden="true" />
              <span className={isBatterySaver ? 'ios-battery-label ios-battery-saving' : 'ios-battery-label'}>
                {Math.round(phoneBattery)}
              </span>
              <Battery
                aria-label={`Battery ${Math.round(phoneBattery)} percent`}
                className={phoneBattery < 20 ? 'ios-battery-low' : ''}
              />
            </div>
          </div>

          <main className="ios-content">
            {activePhoneApp === 'home' ? (
              <div className={`ios-home ios-wallpaper-${wallpaper}`}>
                <div className="ios-home-heading">
                  <div className="ios-date">VICE BAY · LOCAL TIME</div>
                  <div className="ios-clock">{formattedTime}</div>
                  <div className="ios-weather">
                    <CloudSun aria-hidden="true" />
                    <span>{weather === 'rain' ? '68°  Rain showers' : weather === 'night' ? '72°  Clear night' : '84°  Mostly sunny'}</span>
                    <span className="ios-weather-city">Vice Bay</span>
                  </div>
                </div>

                <div className="ios-app-grid">
                  {appIcons.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => handleAppClick(app.id)}
                      className="ios-app"
                      aria-label={`Open ${app.name}`}
                    >
                      <span className={`ios-app-icon ${app.color}`}>
                        {app.icon}
                        {app.badge && <span className="ios-app-badge">{app.badge}</span>}
                      </span>
                      <span className="ios-app-name">{app.name}</span>
                    </button>
                  ))}
                </div>

                <div className="ios-page-dots" aria-hidden="true">
                  <span className="ios-page-dot ios-page-dot-active" />
                  <span className="ios-page-dot" />
                </div>

                <div className="ios-dock">
                  {dockApps.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => handleAppClick(app.id)}
                      className={`ios-dock-app ${app.color}`}
                      aria-label={`Open ${app.name}`}
                    >
                      {app.icon}
                      {app.badge && <span className="ios-app-badge">{app.badge}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="ios-app-screen">
                {activePhoneApp === 'map' && <PhoneMap />}
                {activePhoneApp === 'messages' && <PhoneMessages onAcceptMission={onAcceptMission} />}
                {activePhoneApp === 'contacts' && <PhoneContacts />}
                {activePhoneApp === 'browser' && <PhoneBrowser onSpawnCar={onSpawnCar} />}
                {activePhoneApp === 'bank' && <PhoneBank />}
                {activePhoneApp === 'ammo' && <PhoneAmmo />}
                {activePhoneApp === 'jobs' && <PhoneJobs onDispatchJob={onDispatchJob || (() => {})} />}
                {activePhoneApp === 'garage' && <PhoneGarage onSpawnCar={onSpawnCar} />}
                {activePhoneApp === 'music' && <PhoneMusic />}
                {activePhoneApp === 'weather' && <PhoneWeather />}
                {activePhoneApp === 'camera' && <PhoneCamera />}
                {activePhoneApp === 'settings' && <PhoneSettings />}
              </div>
            )}
          </main>

          <div className="ios-bottom-bar">
            <button
              type="button"
              onClick={handleHome}
              className={`ios-home-button ${activePhoneApp === 'home' ? 'ios-home-button-hidden' : ''}`}
              aria-label="Go to home screen"
              tabIndex={activePhoneApp === 'home' ? -1 : 0}
            >
              <Home aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={activePhoneApp === 'home' ? handleClose : handleHome}
              className="ios-home-indicator"
              aria-label={activePhoneApp === 'home' ? 'Close phone' : 'Return to home screen'}
            />
            <button type="button" onClick={handleClose} className="ios-close-button" aria-label="Close phone">
              <X aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
