/*!
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2020, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */

//
// This is the client bootstrapping script.
// This is where you can register service providers or set up
// your libraries etc.
//
// https://manual.os-js.org/guide/provider/
// https://manual.os-js.org/install/
// https://manual.os-js.org/resource/official/
//

import {
  Core,
  CoreServiceProvider,
  DesktopServiceProvider,
  VFSServiceProvider,
  NotificationServiceProvider,
  SettingsServiceProvider,
  AuthServiceProvider
} from '@osjs/client';

import {PanelServiceProvider} from '@osjs/panels';
import {GUIServiceProvider} from '@osjs/gui';
import {DialogServiceProvider} from '@osjs/dialogs';
import {VoiceAgentServiceProvider} from './voice-agent.js';
import config from './config.js';
import './index.scss';
import lottie from 'lottie-web';
import introAnimation from './assets/intro.json';

const init = () => {
  const osjs = new Core(config, {});

  // Register your service providers
  osjs.register(CoreServiceProvider);
  osjs.register(DesktopServiceProvider);
  osjs.register(VFSServiceProvider);
  osjs.register(NotificationServiceProvider);
  osjs.register(SettingsServiceProvider, {before: true});
  osjs.register(AuthServiceProvider, {before: true});
  osjs.register(PanelServiceProvider);
  osjs.register(DialogServiceProvider);
  osjs.register(GUIServiceProvider);
  osjs.register(VoiceAgentServiceProvider);

  // Initialize Lottie splash if container exists
  const splash = document.getElementById('warp-splash');
  let lottieInstance = null;
  let lottieBgInstance = null;
  
  if (splash) {
    const mount = splash.querySelector('.warp-splash-animation');
    if (mount) {
      lottieInstance = lottie.loadAnimation({
        container: mount,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: introAnimation
      });
    }
  }

  // Initialize background Lottie (runs forever)
  const lottieBg = document.getElementById('warp-lottie-bg');
  if (lottieBg) {
    const mount = lottieBg.querySelector('.warp-lottie-bg-animation');
    if (mount) {
      lottieBgInstance = lottie.loadAnimation({
        container: mount,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: introAnimation
      });
    }
  }

  // macOS UI Setup Functions
  const setupMacOSUI = () => {
    // Hide OS.js default desktop
    const osjsDesktop = document.querySelector('.osjs-desktop');
    if (osjsDesktop) {
      osjsDesktop.style.display = 'none';
      osjsDesktop.style.visibility = 'hidden';
    }

    // Hide OS.js panels
    document.querySelectorAll('.osjs-panel').forEach(panel => {
      panel.style.display = 'none';
    });

    // Show menu bar
    const menuBar = document.getElementById('warp-menu-bar');
    if (menuBar) {
      menuBar.style.display = 'flex';
      menuBar.style.zIndex = '1000';
    }

    // Show desktop
    const desktop = document.getElementById('warp-desktop');
    if (desktop) {
      desktop.style.display = 'block';
      desktop.style.zIndex = '1';
    }

    // Show dock
    const dock = document.getElementById('warp-dock');
    if (dock) {
      dock.style.display = 'flex';
      dock.style.zIndex = '900';
    }

    // Make sure body background is correct (white)
    document.body.style.background = '#ffffff';
    document.body.style.overflow = 'hidden';

    // Show center Lottie animation (agentic interface)
    if (lottieBg) {
      lottieBg.style.display = 'block';
      
      // Add hover interaction for agentic interface
      const agenticOverlay = document.getElementById('warp-agentic-overlay');
      let hoverTimeout = null;
      
      lottieBg.addEventListener('mouseenter', () => {
        hoverTimeout = setTimeout(() => {
          if (agenticOverlay) {
            agenticOverlay.classList.add('active');
            // Focus input when overlay appears
            const input = agenticOverlay.querySelector('input');
            if (input) {
              setTimeout(() => input.focus(), 100);
            }
          }
        }, 300); // Show after 300ms hover
      });
      
      lottieBg.addEventListener('mouseleave', () => {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
        }
      });
      
      // Keep overlay open when hovering over it
      if (agenticOverlay) {
        agenticOverlay.addEventListener('mouseenter', () => {
          if (hoverTimeout) {
            clearTimeout(hoverTimeout);
          }
        });
        
        agenticOverlay.addEventListener('mouseleave', () => {
          agenticOverlay.classList.remove('active');
        });
        
        // Close overlay when clicking outside
        agenticOverlay.addEventListener('click', (e) => {
          if (e.target === agenticOverlay) {
            agenticOverlay.classList.remove('active');
          }
        });
        
        // Handle send button
        const sendButton = agenticOverlay.querySelector('button');
        const input = agenticOverlay.querySelector('input');
        if (sendButton && input) {
          const handleSend = () => {
            const query = input.value.trim();
            if (query) {
              console.log('Agentic query:', query);
              // TODO: Connect to agentic backend
              input.value = '';
            }
          };
          
          sendButton.addEventListener('click', handleSend);
          input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              handleSend();
            }
          });
        }
      }
    }

    // Setup clock
    const updateClock = () => {
      const timeEl = document.getElementById('warp-menu-time');
      if (timeEl) {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        timeEl.textContent = `${hours}:${minutes}`;
      }
    };
    updateClock();
    setInterval(updateClock, 1000);

    // Add default dock apps (Files, Settings, etc.)
    const addDefaultDockApps = async () => {
      try {
        const packageManager = osjs.make('osjs/packages');
        const packages = await packageManager.getPackages();
        
        const dockContainer = document.querySelector('.warp-dock-container');
        if (!dockContainer) return;

        // Apps to show in dock by default
        // OS.js package names vary, try multiple possible names
        const defaultApps = [
          { names: ['FileManager', 'filemanager', 'File Manager', '@osjs/filemanager-application'], displayName: 'Files', icon: '📁' },
          { names: ['Settings', 'settings', 'OS.js Settings', '@osjs/settings-application', 'SettingsApplication'], displayName: 'Settings', icon: '⚙️' },
          { names: ['Calculator', 'calculator', '@osjs/calculator-application'], displayName: 'Calculator', icon: '🔢' },
          { names: ['TextPad', 'textpad', 'Text Editor', '@osjs/textpad-application'], displayName: 'Text Editor', icon: '📝' },
          { names: ['Mailbox', 'mailbox', '@local/mailbox-application'], displayName: 'Mailbox', icon: '📧' }
        ];

        // Find and add apps
        defaultApps.forEach(appConfig => {
          // Try to find app by any of the possible names
          let app = null;
          let appNameToUse = null;
          
          for (const name of appConfig.names) {
            app = packages.find(pkg => {
              const pkgName = pkg.name?.toLowerCase() || '';
              const metadataName = pkg.metadata?.name?.toLowerCase() || '';
              return pkgName === name.toLowerCase() || metadataName === name.toLowerCase();
            });
            
            if (app) {
              appNameToUse = app.name;
              break;
            }
          }
          
          if (app) {
            const displayName = appConfig.displayName || (app.metadata?.title?.en_EN || app.name);
            const iconPath = app.metadata?.icon || app.icon || '';
            
            let iconUrl = '';
            try {
              iconUrl = iconPath ? packageManager.getPackageResource(appNameToUse, iconPath) : '';
            } catch (e) {
              console.log('Could not get icon for', appNameToUse);
            }
            
            const iconEl = document.createElement('div');
            iconEl.className = 'warp-dock-icon';
            iconEl.title = displayName;
            
            if (iconUrl) {
              iconEl.innerHTML = `<img src="${iconUrl}" alt="${displayName}" onerror="this.style.display='none'; this.parentElement.innerHTML='${appConfig.icon}';" />`;
            } else {
              // Use fallback emoji icon
              iconEl.innerHTML = appConfig.icon || '📄';
            }
            
            iconEl.addEventListener('click', async () => {
              try {
                // Launch the application using the correct OS.js API
                await osjs.run(appNameToUse);
              } catch (err) {
                console.error('Error launching app:', err);
              }
            });
            
            // Insert before separator
            const separator = dockContainer.querySelector('.warp-dock-separator');
            if (separator) {
              dockContainer.insertBefore(iconEl, separator);
            } else {
              dockContainer.appendChild(iconEl);
            }
          }
        });
      } catch (err) {
        console.error('Error adding default dock apps:', err);
      }
    };

    // Wait a bit for packages to load, then add default apps
    setTimeout(() => {
      addDefaultDockApps();
    }, 1000);

    // Desktop icons toggle (hidden by default)
    let iconsVisible = false;
    const desktopIcons = document.getElementById('warp-desktop-icons');
    
    // Toggle desktop icons via right-click menu (View menu)
    const viewMenu = document.querySelector('.warp-menu-item:nth-child(5)');
    if (viewMenu && desktopIcons) {
      viewMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        iconsVisible = !iconsVisible;
        if (iconsVisible) {
          desktopIcons.style.display = 'grid';
        } else {
          desktopIcons.style.display = 'none';
        }
      });
    }

    // Add dock icons dynamically when apps are launched
    const addDockIcon = (appName, icon, onClick) => {
      const dockContainer = document.querySelector('.warp-dock-container');
      if (!dockContainer) return;

      const iconEl = document.createElement('div');
      iconEl.className = 'warp-dock-icon';
      iconEl.innerHTML = `<img src="${icon}" alt="${appName}" />`;
      iconEl.title = appName;
      iconEl.addEventListener('click', onClick);
      
      // Insert before separator
      const separator = dockContainer.querySelector('.warp-dock-separator');
      if (separator) {
        dockContainer.insertBefore(iconEl, separator);
      } else {
        dockContainer.appendChild(iconEl);
      }

      return iconEl;
    };

    // Monitor window creation to add dock icons
    osjs.on('osjs/application:window:created', (ev, {window: win}) => {
      const proc = win._proc;
      if (proc && proc.metadata) {
        const appName = proc.metadata.name || 'App';
        const icon = proc.metadata.icon || '';
        const iconEl = addDockIcon(appName, icon, () => {
          if (win.minimized) {
            win.restore();
          } else {
            win.focus();
          }
        });

        // Mark as active
        if (iconEl) {
          iconEl.classList.add('warp-dock-icon--active');
        }

        // Remove on window destroy
        win.on('destroy', () => {
          if (iconEl && iconEl.parentNode) {
            iconEl.parentNode.removeChild(iconEl);
          }
        });

        // Toggle active state
        win.on('focus', () => {
          document.querySelectorAll('.warp-dock-icon').forEach(el => {
            el.classList.remove('warp-dock-icon--active');
          });
          if (iconEl) {
            iconEl.classList.add('warp-dock-icon--active');
          }
        });
      }
    });
  };

  // Boot OS.js then transition to macOS UI
  const hideSplash = () => {
    if (!splash) return;
    
    // Don't destroy lottieInstance - let it fade out but keep running
    // Fade out splash but keep background animation
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 500ms ease-out';
    
    window.setTimeout(() => {
      splash.style.display = 'none';
      // Keep lottieInstance running, don't destroy it
      
      // Show macOS UI (includes background Lottie)
      setupMacOSUI();
    }, 520);
  };

  // Immediately hide OS.js desktop (before boot)
  const hideDefaultDesktop = () => {
    const hide = () => {
      document.querySelectorAll('.osjs-desktop').forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
      });
      document.querySelectorAll('.osjs-panel').forEach(el => {
        el.style.display = 'none';
      });
    };
    
    // Try immediately
    hide();
    
    // Also check after DOM updates
    const observer = new MutationObserver(() => {
      hide();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Stop observing after 5 seconds
    setTimeout(() => observer.disconnect(), 5000);
  };

  // Play startup sound - very aggressive approach
  let audioPlayed = false;
  const playStartSound = () => {
    if (audioPlayed) return;
    const audio = document.getElementById('warp-start-sound');
    if (audio) {
      audio.volume = 0.7;
      audio.currentTime = 0;
      
      const tryPlay = () => {
        audio.play().then(() => {
          audioPlayed = true;
        }).catch(() => {
          // Will retry on interaction
        });
      };
      
      audio.load();
      if (audio.readyState >= 2) {
        tryPlay();
      } else {
        audio.addEventListener('canplay', tryPlay, { once: true });
        audio.addEventListener('loadeddata', tryPlay, { once: true });
      }
      
      // Also try on multiple events
      ['click', 'mousemove', 'keydown', 'touchstart'].forEach(event => {
        const handler = () => {
          tryPlay();
          document.removeEventListener(event, handler);
        };
        document.addEventListener(event, handler, { once: true });
      });
    }
  };

  // Try to play immediately
  playStartSound();
  
  // Try multiple times with delays
  setTimeout(playStartSound, 100);
  setTimeout(playStartSound, 300);
  setTimeout(playStartSound, 500);
  setTimeout(playStartSound, 1000);

  Promise.resolve()
    .then(() => {
      hideDefaultDesktop();
      playStartSound(); // Also try during boot
      return osjs.boot();
    })
    .then(() => {
      // Hide default desktop again after boot
      hideDefaultDesktop();
      
      // Small delay for smooth transition
      return new Promise(resolve => setTimeout(resolve, 800));
    })
    .then(() => hideSplash())
    .catch((err) => {
      console.error('Boot error', err);
      hideSplash();
    });
};

window.addEventListener('DOMContentLoaded', () => init());
