// ==UserScript==
// @name         Auto Battle Enhanced
// @namespace    http://tampermonkey.net/
// @description  SoulBlade Demon, Slot Machine, Las Noches, Valhalla
// @author       Aoimaru
// @version      1.10.0
// @match        *://*.pockieninja.online/*
// @grant        none
// ==/UserScript==

// changelog    1.0.0 - Initial release
// changelog    1.0.1 - Fix Valhalla
// changelog    1.0.2 - Fix Las Noches
// changelog    1.0.3 - Fix Z Index Floating UI Behind Chat Panel
// changelog    1.1.0 - Add Parties Automation for Slot Machine
// changelog    1.2.0 - Disable Select When Automation Start And Improve Snackbar Failed Effect
// changelog    1.3.0 - Make Domain Wildcard
// changelog    1.4.0 - Add Retry Mechanism for Valhalla
// changelog    1.5.0 - Refactor Las Noches Automation
// changelog    1.6.0 - Add Retry Mechanism for Las Noches
// changelog    1.7.0 - Refactor Entire Code
// changelog    1.8.0 - Add Automation for Ninja Trial
// changelog    1.8.1 - Fix Soulblade Demon Automation
// changelog    1.9.0 - Add Dark Theme Support
// changelog    1.10.0 - Add Automation for Impel Down

const COLORS = {
  SUCCESS: 'rgba(64, 160, 43, 0.9)',
  FAILED: 'rgba(230, 69, 83, 0.9)',
};
const items = [
  { id: 'ex', label: 'Exploration' },
  { id: 'sd', label: 'Soulblade Demon' },
  { id: 'sm', label: 'Slot Machine - Leader' },
  { id: 'sm2', label: 'Slot Machine - Parties' },
  { id: 'ln', label: 'Las Noches' },
  { id: 'vh', label: 'Valhalla' },
  { id: 'nt', label: 'Ninja Trial - Leader' },
  { id: 'nt2', label: 'Ninja Trial - Parties' },
  { id: 'id', label: 'Impel Down' },
];
const DEFAULT_TOP = 780;
const DEFAULT_LEFT = 'auto';
const SNACKBAR_ID = 'SNACKBAR';
const FLOATING_UI_ID = 'FLOATING_UI';
const AUTO_SNACKBAR = 'autoBattleSnackbar';
const AUTO_UI_TOP = 'autoBattle_uiTop';
const AUTO_UI_LEFT = 'autoBattle_uiLeft';
const uiTop = parseFloat(localStorage.getItem(AUTO_UI_TOP)) || DEFAULT_TOP;
const uiLeft = parseFloat(localStorage.getItem(AUTO_UI_LEFT)) || DEFAULT_LEFT;

class TeamStone {
  static simulateRealClick(el) {
    ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'].forEach((type) => {
      el.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      );
    });
  }

  static normalizeText(s) {
    return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  static clickByTextInPanel(
    text = 'heal',
    selectorParent = '.panel--original, .panel--dark',
    childSelector = '.clickable'
  ) {
    const panels = document.querySelectorAll(selectorParent);

    for (const panel of panels) {
      const target = Array.from(panel.querySelectorAll(childSelector)).find(
        (el) => this.normalizeText(el.textContent) === text.toLowerCase()
      );
      if (target) {
        target.click();
        return target;
      }
    }
    return null;
  }

  static open() {
    const ids = [
      27500, // teamstone
    ];
    const selector = ids.map((id) => `#npc-container-${id} canvas`).join(', ');
    const npcCanvas = document.querySelector(selector);

    if (!npcCanvas) {
      showSnackbar('Team Stone canvas not found.', COLORS.FAILED);
      return;
    }

    const rect = npcCanvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const events = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'];
    events.forEach((type) => {
      const evt = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY,
        view: window,
      });

      Object.defineProperty(evt, 'offsetX', { get: () => rect.width / 2 });
      Object.defineProperty(evt, 'offsetY', { get: () => rect.height / 2 });

      npcCanvas.dispatchEvent(evt);
    });
  }

  static heal() {
    this.open();

    setTimeout(() => {
      const el = this.clickByTextInPanel('heal') || null;
      if (!el) {
        this.simulateRealClick(el);
      }

      showSnackbar('Heal success...', COLORS.SUCCESS);
      return;
    }, 1000);
  }

  static repair() {
    this.open();

    setTimeout(() => {
      const el = this.clickByTextInPanel('repair all') || null;
      if (!el) {
        this.simulateRealClick(el);
      }

      showSnackbar('Repair success...', COLORS.SUCCESS);
      return;
    }, 1000);
  }

  static ninjaTrial() {
    this.open();

    setTimeout(() => {
      const el = this.clickByTextInPanel(`ninja's trial`) || null;
      if (!el) {
        this.simulateRealClick(el);
      }
      return;
    }, 1000);
  }
}

class SlotMachine {
  static isAutomatic = false;
  static isSlotMachineIconClicked = false;

  static startAutomationParties() {
    if (!this.isAutomatic) {
      this.isAutomatic = true;
      this.challengeAsParties();
    }
  }

  static startAutomation() {
    if (!this.isAutomatic) {
      this.isAutomatic = true;
      this.challenge();
    }
  }

  static stopAutomation() {
    this.isAutomatic = false;
  }

  static challengeAsParties() {
    if (!this.isAutomatic) return;

    const boundCallback = this.challengeAsParties.bind(this);

    setTimeout(() => {
      repetitiveBattleCheck(boundCallback, true, 1500);
    }, 3000);
  }

  static challenge() {
    if (!this.isAutomatic) return;

    const boundCallback = this.challenge.bind(this);
    const challengeButton = document.querySelector('.slot-machine__challenge-btn');

    if (challengeButton) {
      challengeButton.click();

      setTimeout(() => {
        const battleRunning = document.querySelector('#fightContainer');

        if (!battleRunning) {
          window.autoBattleRetryLogic();
          return;
        }

        repetitiveBattleCheck(boundCallback, true, 1500);
      }, 1500);
      return;
    }

    const observer = new MutationObserver((_, obs) => {
      const buttonToClick = document.querySelector('.slot-machine__challenge-btn');

      if (buttonToClick) {
        buttonToClick.click();

        obs.disconnect();

        setTimeout(() => {
          const battleRunning = document.querySelector('#fightContainer');

          if (!battleRunning) {
            window.autoBattleRetryLogic();
          } else {
            repetitiveBattleCheck(boundCallback, true, 1500);
          }
        }, 1500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    if (!this.isSlotMachineIconClicked) {
      const slotIcon = document.querySelector('#game-container > div.slot-machine__icon > button > img');

      if (slotIcon) {
        slotIcon.click();
        this.isSlotMachineIconClicked = true;
      }
    }
  }
}

class SoulDemonBlade {
  static isAutomatic = false;
  static farmingLoop = null;
  static clickDelay = 400;
  static battleDuration = 5000;
  static loopInterval = 1000;

  static simulateBossClick() {
    const ids = [
      10019, // demon brute
      10026, // plague demon
      10039, // firebore
      10040, // frostbore
      10041, // earthbore
      10042, // windbore
      10043, // thunderbore
    ];
    const selector = ids.map((id) => `#npc-container-${id} canvas`).join(', ');
    const npcCanvas = document.querySelector(selector);

    if (!npcCanvas) {
      showSnackbar('Soulblade Demon canvas not found.', COLORS.FAILED);
      return;
    }

    const rect = npcCanvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const events = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'];
    events.forEach((type) => {
      const evt = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY,
        view: window,
      });

      Object.defineProperty(evt, 'offsetX', { get: () => rect.width / 2 });
      Object.defineProperty(evt, 'offsetY', { get: () => rect.height / 2 });

      npcCanvas.dispatchEvent(evt);
    });
  }

  static clickButtonByText(text) {
    const elements = Array.from(document.querySelectorAll('button, span, div'));
    const target = elements.find((el) => el.textContent.trim().toLowerCase() === text.toLowerCase());
    if (target) {
      target.click();
      return true;
    } else {
      return false;
    }
  }

  static checkForOutOfProofs() {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    return elements.some((el) => el.textContent.toLowerCase().includes('not enough demon proof'));
  }

  static runLoop() {
    if (!this.isAutomatic) return;

    this.simulateBossClick();

    const boundCallback = this.runLoop.bind(this);

    setTimeout(() => {
      if (this.checkForOutOfProofs()) {
        showSnackbar('Out of Demon Proofs. Stopping.', COLORS.FAILED);
        this.isAutomatic = false;
        return;
      }

      const accepted = this.clickButtonByText('Accept');

      if (!accepted) {
        showSnackbar('Accept not found, retrying in next loop.', COLORS.FAILED);
        this.farmingLoop = setTimeout(boundCallback, this.loopInterval);
        return;
      }

      setTimeout(() => {
        repetitiveBattleCheck(() => {
          if (this.isAutomatic) {
            this.farmingLoop = setTimeout(boundCallback, this.loopInterval);
          }
        }, false);
      }, this.battleDuration);
    }, this.clickDelay);
  }

  static startAutomation() {
    this.isAutomatic = true;

    if (!this.farmingLoop) {
      this.farmingLoop = setTimeout(this.runLoop(), this.loopInterval);
    }
  }

  static stopAutomation() {
    this.isAutomatic = false;

    if (this.farmingLoop) {
      clearTimeout(this.farmingLoop);
      this.farmingLoop = null;
    }
  }
}

class Exploration {
  static isAutomatic = false;
  static selectedMonsterIndex = null;
  static currentBattleCount = 0;
  static maxBattleCount = 10;
  static monsterSelectors = [
    '#game-container > div:nth-child(6) > div:nth-child(2) > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(1) > div > div:nth-child(2) > div.j-panel > div:nth-child(2) > img',
    '#game-container > div:nth-child(6) > div:nth-child(2) > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(2) > div > div:nth-child(2) > div.j-panel > div:nth-child(2) > img',
    '#game-container > div:nth-child(6) > div:nth-child(2) > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(3) > div > div:nth-child(2) > div.j-panel > div:nth-child(2) > img',
    '#game-container > div:nth-child(6) > div:nth-child(2) > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(4) > div > div:nth-child(2) > div.j-panel > div:nth-child(2) > img',
    '#game-container > div:nth-child(6) > div:nth-child(2) > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(5) > div > div:nth-child(2) > div.j-panel > div:nth-child(2) > img',
  ];

  static clickMonster(index) {
    const selector = this.monsterSelectors[index];
    const monster = document.querySelector(selector);

    if (monster && !monster.closest('button')?.classList.contains('--disabled')) {
      monster.click();
      return true;
    } else {
      return false;
    }
  }

  static startAutomation() {
    const boundCallback = this.startAutomation.bind(this);

    if (!this.isAutomatic) {
      const userInput = prompt('Please choose monster number that you want to attack (1-5):');
      const index = parseInt(userInput, 10);

      if (isNaN(index) || index < 1 || index > 5) {
        showSnackbar('Invalid input. Must be 1 until 5.', COLORS.FAILED);
        return;
      }

      this.isAutomatic = true;
      this.selectedMonsterIndex = index - 1;
      this.currentBattleCount = 0;
    }

    if (!this.isAutomatic || this.currentBattleCount >= this.maxBattleCount) {
      this.isAutomatic = false;
      return;
    }

    if (this.clickMonster(this.selectedMonsterIndex)) {
      repetitiveBattleCheck(
        () => {
          this.currentBattleCount++;
          setTimeout(boundCallback, 1000);
        },
        false,
        500
      );
    } else {
      showSnackbar('Monster cannot be clicked. Try again in 2 seconds.', COLORS.FAILED);
      setTimeout(boundCallback, 2000);
    }
  }

  static stopAutomation() {
    this.isAutomatic = false;
  }
}

class LasNoches {
  static isAutomatic = false;
  static targetFloor = 170;
  static isFailureTriggered = false;

  static startOrContinue() {
    if (!this.isAutomatic) return;

    const boundCallback = this.startOrContinue.bind(this);

    let floorElement = [...document.querySelectorAll('pre')].find((pre) =>
      pre.textContent.trim().startsWith('Current Floor')
    );

    if (floorElement) {
      let currentFloor = parseInt(floorElement.textContent.replace('Current Floor', '').trim(), 10);

      if (currentFloor === this.targetFloor) {
        document.getElementById('toggleButton').click();
        this.isFailureTriggered = false;
        this.isAutomatic = false;
        return;
      }
    }

    const selector = 'button.theme__button--original, button.theme__button--dark';
    const button = [...document.querySelectorAll(selector)].find((btn) =>
      ['continue', 'start'].includes(btn.textContent.trim().toLowerCase())
    );

    if (button) {
      button.click();

      setTimeout(() => {
        const battleRunning = document.querySelector('#fightContainer');

        if (!battleRunning) {
          this.isFailureTriggered = true;
          window.autoBattleRetryLogic();
          return;
        }

        repetitiveBattleCheck(boundCallback, false, 1500);
      }, 1500);
    }
  }

  static startAutomation() {
    if (this.isAutomatic) return;

    if (this.isFailureTriggered) {
      this.isFailureTriggered = false;
    } else {
      const userInput = prompt('Input floor destination (ex: 170):', '170');
      const parsedFloor = parseInt(userInput, 10);

      if (!isNaN(parsedFloor) && parsedFloor > 0) {
        this.targetFloor = parsedFloor;
      } else {
        showSnackbar('Invalid. Use positive numbers.');
        document.getElementById('toggleButton')?.click();
        return;
      }
    }

    this.isAutomatic = true;
    showSnackbar('Las Noches automation started...', COLORS.SUCCESS);
    this.startOrContinue();
  }

  static stopAutomation() {
    this.isAutomatic = false;
    showSnackbar('Las Noches automation stopped...', COLORS.SUCCESS);
  }
}

class Valhalla {
  static isAutomatic = false;
  static currentDungeonIndex = 0;
  static valhallaDungeons = [
    {
      completeSelector: '#game-container > div:nth-child(5) > div:nth-child(2) > img[src*="0_complete.png"]',
      buttonSelector: '#game-container > div:nth-child(5) > div:nth-child(2) > button > img',
      monsterContainer: '#game-container > div:nth-child(5) > div:nth-child(3)',
    },
    {
      completeSelector: '#game-container > div:nth-child(5) > div:nth-child(3) > img[src*="1_complete.png"]',
      buttonSelector: '#game-container > div:nth-child(5) > div:nth-child(3) > button > img',
      monsterContainer: '#game-container > div:nth-child(5) > div:nth-child(4)',
    },
    {
      completeSelector: '#game-container > div:nth-child(5) > div:nth-child(4) > img[src*="2_complete.png"]',
      buttonSelector: '#game-container > div:nth-child(5) > div:nth-child(4) > button > img',
      monsterContainer: '#game-container > div:nth-child(5) > div:nth-child(5)',
    },
    {
      completeSelector: '#game-container > div:nth-child(5) > div:nth-child(5) > img[src*="3_complete.png"]',
      buttonSelector: '#game-container > div:nth-child(5) > div:nth-child(5) > button > img',
      monsterContainer: '#game-container > div:nth-child(5) > div:nth-child(6)',
    },
  ];

  static waitForElement(selector, callback, checkInterval = 500) {
    const interval = setInterval(() => {
      if (!this.isAutomatic) return clearInterval(interval);
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        callback(el);
      }
    }, checkInterval);
  }

  static openDungeon(index, callback) {
    this.waitForElement(this.valhallaDungeons[index].buttonSelector, (button) => {
      button.click();
      this.waitForElement('img[src*="dungeons/select.png"]', () => {
        callback();
      });
    });
  }

  static nextEnemy(baseSelector, currentMonster, callback) {
    if (!this.isAutomatic) return;

    if (currentMonster > 6) {
      callback();
      return;
    }

    const monsterBtn = document.querySelector(`${baseSelector} > button:nth-child(${currentMonster}) > img`);
    const boundCallback = this.nextEnemy.bind(this, baseSelector, currentMonster, callback);

    if (!monsterBtn || monsterBtn.parentElement.classList.contains('--disabled')) {
      currentMonster++;
      return this.nextEnemy(baseSelector, currentMonster, callback);
    }

    monsterBtn.click();

    setTimeout(() => {
      const battleRunning = document.querySelector('#fightContainer');

      if (!battleRunning) {
        window.autoBattleRetryLogic();
      } else {
        currentMonster++;
        repetitiveBattleCheck(boundCallback, false, 4000);
      }
    }, 1500);
  }

  static fightAllMonsters(index, callback) {
    const baseSelector = this.valhallaDungeons[index].monsterContainer;
    let currentMonster = 2;

    this.nextEnemy(baseSelector, currentMonster, callback);
  }

  static nextDungeon() {
    if (!this.isAutomatic) return;

    const monsterSelectPanelSelector = 'img[src*="dungeons/select.png"]';
    const boundCallback = this.nextDungeon.bind(this);

    if (document.querySelector(monsterSelectPanelSelector)) {
      return this.fightAllMonsters(this.currentDungeonIndex, () => {
        this.currentDungeonIndex++;
        setTimeout(boundCallback, 1000);
      });
    }

    if (this.currentDungeonIndex >= this.valhallaDungeons.length) {
      document.getElementById('toggleButton')?.click();
      this.isAutomatic = false;
      return;
    }

    const dungeon = this.valhallaDungeons[this.currentDungeonIndex];

    if (document.querySelector(dungeon.completeSelector)) {
      this.currentDungeonIndex++;
      return this.nextDungeon();
    }

    this.openDungeon(this.currentDungeonIndex, () => {
      this.fightAllMonsters(this.currentDungeonIndex, () => {
        this.currentDungeonIndex++;
        setTimeout(boundCallback, 1000);
      });
    });
  }

  static battle() {
    if (this.isAutomatic) return;
    this.isAutomatic = true;
    this.currentDungeonIndex = 0;

    this.nextDungeon();
  }

  static startAutomation() {
    if (!this.isAutomatic) {
      this.battle();
    }
  }

  static stopAutomation() {
    this.isAutomatic = false;
  }
}

class NinjaTrial {
  static isAutomatic = false;
  static trialInterval = null;

  static startAutomationParties() {
    if (!this.isAutomatic) {
      this.isAutomatic = true;
      this.applyTrialAsParties();
    }
  }

  static startAutomation() {
    if (!this.isAutomatic) {
      this.isAutomatic = true;
      this.applyTrial();
    }
  }

  static stopAutomation() {
    this.isAutomatic = false;
  }

  static applyTrial() {
    if (!this.isAutomatic) return;

    const boundCallback = this.applyTrial.bind(this);
    const buttons = [...document.querySelectorAll('button')];
    const applyBtn = buttons.find((b) => b.textContent.trim() === 'Apply Trial');

    if (!applyBtn.disabled) {
      applyBtn.click();
    } else {
      window.autoBattleRetryLogic();
      return;
    }

    repetitiveBattleCheck(boundCallback, true, 2000);
    return;
  }

  static applyTrialAsParties() {
    if (!this.isAutomatic) return;

    const boundCallback = this.applyTrialAsParties.bind(this);

    setTimeout(() => {
      repetitiveBattleCheck(boundCallback, true, 1500);
    }, 3000);
  }
}

class ImpelDown {
  static isAutomatic = false;

  static getCurrentFloor() {
    const currentPre = [...document.querySelectorAll('pre')].find((pre) => pre.textContent.trim() === 'Current');

    if (!currentPre) {
      return 0;
    }

    const containerDiv = currentPre.parentElement;
    const floorInfoDiv = containerDiv.nextElementSibling;

    if (!floorInfoDiv) {
      return 0;
    }

    const floorPre = floorInfoDiv.querySelector('pre');
    const floorText = floorPre ? floorPre.textContent : '';
    const match = floorText.match(/Floor\s(\d+)/i);

    if (match && match[1]) {
      const floorNumber = parseInt(match[1], 10);
      return floorNumber;
    }

    return 0;
  }

  static startAutomation() {
    if (!this.isAutomatic) {
      this.isAutomatic = true;
      this.clickImpelDownFloor();
    }
  }

  static stopAutomation() {
    this.isAutomatic = false;
  }

  static clickImpelDownFloor() {
    if (!this.isAutomatic) return;

    const boundCallback = this.clickImpelDownFloor.bind(this);
    const floorNumber = this.getCurrentFloor();

    if (!floorNumber) {
      showSnackbar('Please Open Impel Down first.', COLORS.FAILED);
      return;
    }

    if (floorNumber === 26) {
      document.getElementById('toggleButton').click();
      this.isAutomatic = false;
      return;
    }

    const targetText = `Floor ${floorNumber}`;
    const imageSelector = 'img[src*="/UIResource/ImpelDown/prisonfloor.png"].j-image.clickable';
    const clickableImages = document.querySelectorAll(imageSelector);

    let targetImage = null;

    for (const image of clickableImages) {
      const parentDiv = image.parentElement;

      if (parentDiv) {
        const preElement = parentDiv.querySelector('pre');

        if (preElement && preElement.textContent.trim().startsWith(targetText)) {
          targetImage = image;
          break;
        }
      }
    }

    if (targetImage) {
      targetImage.click();

      setTimeout(() => {
        const battleRunning = document.querySelector('#fightContainer');

        if (!battleRunning) {
          window.autoBattleRetryLogic();
          return;
        }

        repetitiveBattleCheck(boundCallback, false, 1500);
      }, 1500);
    }
  }
}

function showSnackbar(message, background, duration = 3000) {
  const existing = document.getElementById(SNACKBAR_ID);
  const IS_FAILED = background === COLORS.FAILED;

  if (existing) {
    existing.remove();
  }

  const snackbar = document.createElement('div');
  snackbar.id = SNACKBAR_ID;
  snackbar.textContent = message;

  const floatingUI = document.getElementById(FLOATING_UI_ID);

  const uiRect = floatingUI.getBoundingClientRect();
  const rectTop = uiRect.top;
  const snackbarCenterX = uiRect.left + uiRect.width / 2;

  const snackbarTop = rectTop - 40;

  Object.assign(snackbar.style, {
    position: 'fixed',
    top: `${snackbarTop}px`,
    left: `${snackbarCenterX}px`,
    width: 'auto',
    whiteSpace: 'nowrap',
    transform: 'translate(-50%, 10px)',
    background,
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: 'sans-serif',
    zIndex: 99999,
    textAlign: 'center',
    opacity: '0',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
  });

  document.body.appendChild(snackbar);

  requestAnimationFrame(() => {
    snackbar.style.opacity = '1';

    if (!IS_FAILED) {
      snackbar.style.transform = 'translate(-50%, 0)';
    } else {
      const ANIMATION_DURATION = '0.4s';
      snackbar.style.animation = `snackbar-shake ${ANIMATION_DURATION} ease-in-out 1`;

      setTimeout(() => {
        snackbar.style.animation = 'none';
        snackbar.style.transform = 'translate(-50%, 0)';
      }, 200);
    }
  });

  setTimeout(() => {
    snackbar.style.opacity = '0';
    snackbar.style.transform = 'translate(-50%, -10px)';
    setTimeout(() => snackbar.remove(), 400);
  }, duration);
}

function makeDraggable(element, handle) {
  let offsetX = false;
  let offsetY = false;
  let isDragging = false;

  handle.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
  });

  function move(e) {
    if (!isDragging) return;
    const left = e.clientX - offsetX;
    const top = e.clientY - offsetY;
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.right = 'auto';
  }

  function stop() {
    isDragging = false;
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', stop);

    // saved last state
    localStorage.setItem(AUTO_UI_TOP, element.style.top);
    localStorage.setItem(AUTO_UI_LEFT, element.style.left);
  }
}

function repetitiveBattleCheck(callback, isNeedHeal = false, delay = 500) {
  let checkInterval = setInterval(() => {
    let buttons = document.querySelectorAll('.theme__button--original, .theme__button--dark');
    for (let button of buttons) {
      if (button.textContent.trim() === 'Close') {
        button.click();
        showSnackbar('Battle end.', COLORS.SUCCESS);
        if (isNeedHeal) {
          TeamStone.heal();
        }
        clearInterval(checkInterval);
        setTimeout(callback, delay);
        return;
      }
    }
  }, 500);
}

function buttonToggle() {
  let isRunning = false;
  let isRetrying = false;
  let countdownInterval = null;

  const button = document.getElementById('toggleButton');
  const selectedItem = document.getElementById('itemSelect');

  window.autoBattleRetryLogic = () => {
    if (isRunning && !isRetrying) {
      isRetrying = true;

      switch (selectedItem.value) {
        case 'ex':
          Exploration.stopAutomation();
          break;
        case 'sd':
          SoulDemonBlade.stopAutomation();
          break;
        case 'sm':
          SlotMachine.stopAutomation();
          break;
        case 'ln':
          LasNoches.stopAutomation();
          break;
        case 'vh':
          Valhalla.stopAutomation();
          break;
        case 'nt':
          NinjaTrial.stopAutomation();
          break;
        case 'id':
          ImpelDown.stopAutomation();
          break;
      }

      let countdown = 3;
      button.textContent = `Retrying (${countdown})`;
      button.classList.add('active');

      countdownInterval = setInterval(() => {
        countdown -= 1;
        if (countdown > 0) {
          button.textContent = `Retrying (${countdown})`;
        } else {
          clearInterval(countdownInterval);
          isRetrying = false;
          isRunning = false;
          button.textContent = `Stop`;
          button.classList.toggle('active', !isRunning);
          setTimeout(() => {
            button.click();
          }, 1000);
        }
      }, 1000);
    }
  };

  button.addEventListener('click', () => {
    const selectedValue = selectedItem.value;
    const itemExist = items.find((i) => i.id === selectedValue);

    if (!itemExist) {
      showSnackbar('Please choose item first.', COLORS.FAILED);
      return;
    }

    if (isRunning) {
      if (countdownInterval) clearInterval(countdownInterval);
      isRetrying = false;
    }

    isRunning = !isRunning;
    button.textContent = isRunning ? `Stop` : `Start`;
    button.classList.toggle('active', isRunning);

    selectedItem.disabled = isRunning;

    switch (selectedValue) {
      case 'ex':
        isRunning ? Exploration.startAutomation() : Exploration.stopAutomation();
        break;
      case 'sd':
        isRunning ? SoulDemonBlade.startAutomation() : SoulDemonBlade.stopAutomation();
        break;
      case 'sm':
        isRunning ? SlotMachine.startAutomation() : SlotMachine.stopAutomation();
        break;
      case 'sm2':
        isRunning ? SlotMachine.startAutomationParties() : SlotMachine.stopAutomation();
        break;
      case 'ln':
        isRunning ? LasNoches.startAutomation() : LasNoches.stopAutomation();
        break;
      case 'vh':
        isRunning ? Valhalla.startAutomation() : Valhalla.stopAutomation();
        break;
      case 'nt':
        isRunning ? NinjaTrial.startAutomation() : NinjaTrial.stopAutomation();
        break;
      case 'nt2':
        isRunning ? NinjaTrial.startAutomationParties() : NinjaTrial.stopAutomation();
        break;
      case 'id':
        isRunning ? ImpelDown.startAutomation() : ImpelDown.stopAutomation();
        break;
    }

    showSnackbar(`${itemExist.label} automation is ${isRunning ? 'started' : 'stopped'}.`, COLORS.SUCCESS);
  });
}

function injectGlobalStyles() {
  const style = document.createElement('style');
  style.textContent = `
      /* Keyframes for the Vibrate/Squeeze effect */
      @keyframes snackbar-shake {
        0%, 100% { transform: translate(-50%, 0); }
        10%, 30%, 50%, 70%, 90% { transform: translate(calc(-50% - 10px), 0); }
        20%, 40%, 60%, 80% { transform: translate(calc(-50% + 10px), 0); }
      }
      .auto-btn {
        width: 100%;
        padding: 6px 10px;
        border: none;
        border-radius: 5px;
        background-color: #1e66f5;
        color: white;
        font-size: 13px;
        cursor: pointer;
        transition: 0.2s ease-in-out;
      }
      .auto-btn.enabled {
        opacity: 1;
      }
      .auto-btn:hover:enabled {
        background-color: #0a4ed6;
      }
      .auto-btn.active {
        background-color: #e64553;
      }
      .auto-btn.active:hover {
        background-color: #dc1e2e;
      }
  `;
  document.head.appendChild(style);
}

function floatingUI() {
  const div = document.createElement('div');
  div.id = FLOATING_UI_ID;
  div.style.position = 'fixed';
  div.style.top = `${uiTop}px`;
  div.style.left = uiLeft === 'auto' ? uiLeft : `${uiLeft}px`;
  if (div.style.left === 'auto') {
    div.style.right = '20px';
  }
  div.style.background = 'rgba(0, 0, 0, 0.5)';
  div.style.padding = '12px';
  div.style.zIndex = 99999;
  div.style.borderRadius = '8px';
  div.style.fontFamily = 'sans-serif';
  div.style.width = '170px';
  div.style.userSelect = 'none';

  // ✅ Add a draggable header
  const header = document.createElement('div');
  header.textContent = 'Auto Battle';
  header.style.color = '#ffffff';
  header.style.textAlign = 'center';
  header.style.fontWeight = 'bold';
  header.style.cursor = 'move';
  header.style.marginBottom = '10px';

  // ✅ Build inner content
  div.innerHTML = `
      <select id="itemSelect" style="width: 100%; padding: 5px; margin-bottom: 10px; border-radius: 5px; text-align: center; text-align-last: center;">
        <option value="" disabled selected>-- Choose item first --</option>
        ${items.map((item) => `<option value="${item.id}">${item.label}</option>`).join('')}
      </select>
      <button id="toggleButton" class="auto-btn">Start</button>
    `;

  div.prepend(header);
  document.body.appendChild(div);

  makeDraggable(div, header);

  buttonToggle();
}

(function () {
  'use strict';

  injectGlobalStyles();
  floatingUI();
})();
