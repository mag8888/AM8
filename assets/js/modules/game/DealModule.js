/**
 * DealModule v0.1
 * Микромодуль работы с сделками (малый/большой) на клиенте.
 * Хранит состояние в sessionStorage помеченное roomId.
 */
(function attachDealModule(){
    class DealModule {
        constructor({ eventBus, roomId, apiBaseUrl = '/api/cards' } = {}){
            this.eventBus = eventBus || null;
            this.roomId = roomId || (window.app?.getModule?.('gameState')?.roomId);
            this.apiBaseUrl = apiBaseUrl;
            this.stateKey = `am_deals_${this.roomId}`;
            this.state = this._loadState();
        }

        _loadState(){
            try{
                const raw = sessionStorage.getItem(this.stateKey);
                if(raw) return JSON.parse(raw);
            }catch(_){}
            return { decks: { deal: {draw:[],discard:[]}, big_deal: {draw:[],discard:[]} }, ownedCardIds: [] };
        }

        _saveState(){
            try{ sessionStorage.setItem(this.stateKey, JSON.stringify(this.state)); }catch(_){}
        }

        async ensureDecksLoaded(){
            if(this.state.decks.deal.draw.length || this.state.decks.big_deal.draw.length) return;
            const res = await fetch(this.apiBaseUrl, { credentials:'same-origin' });
            const json = await res.json();
            const decks = (json?.data?.decks)||[];
            const pick = (id)=>{
                const d = decks.find(x=>x.id===id) || { drawPile:[], discardPile:[] };
                return { draw: d.drawPile.map(c=>c), discard: d.discardPile.map(c=>c) };
            };
            this.state.decks.deal = pick('deal');
            this.state.decks.big_deal = pick('big_deal');
            this._saveState();
        }

        draw(deckId){
            const deck = this.state.decks[deckId];
            if(!deck) return null;
            if(deck.draw.length === 0){
                // перекидываем discard -> draw, исключая купленные карты
                const filtered = deck.discard.filter(c=>!this.state.ownedCardIds.includes(c.id));
                // перемешиваем
                for(let i=filtered.length-1;i>0;i--){
                    const j = Math.floor(Math.random()*(i+1));
                    [filtered[i],filtered[j]]=[filtered[j],filtered[i]];
                }
                deck.draw = filtered;
                deck.discard = [];
            }
            const card = deck.draw.shift() || null;
            this._saveState();
            return card;
        }

        discard(deckId, card){
            if(!card) return;
            const deck = this.state.decks[deckId];
            if(!deck) return;
            deck.discard.unshift(card);
            this._saveState();
        }

        acquire(card){
            if(!card) return;
            if(!this.state.ownedCardIds.includes(card.id)) this.state.ownedCardIds.push(card.id);
            this._saveState();
            this.eventBus?.emit('deal:acquired', { card });
        }

        async chooseAndDrawSmallOrBig(){
            await this.ensureDecksLoaded();
            return new Promise((resolve)=>{
                const ask = (deckId)=>{
                    const card = this.draw(deckId);
                    resolve({ deckId, card });
                };
                // Простая модалка через window.alert/confirm-подобный UI
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:4000;display:flex;align-items:center;justify-content:center;';
                const box = document.createElement('div');
                box.style.cssText = 'background:#0b1220;color:#fff;padding:20px;border-radius:12px;min-width:320px;box-shadow:0 10px 40px rgba(0,0,0,.5)';
                box.innerHTML = '<div style="font-size:18px;margin-bottom:12px">Выберите сделку</div>'+
                    '<div style="display:flex;gap:12px;justify-content:center">'+
                    '<button id="deal_small" class="btn btn-primary">Малая</button>'+
                    '<button id="deal_big" class="btn btn-secondary">Большая</button>'+
                    '</div>';
                overlay.appendChild(box);
                document.body.appendChild(overlay);
                overlay.querySelector('#deal_small').onclick=()=>{ document.body.removeChild(overlay); ask('deal'); };
                overlay.querySelector('#deal_big').onclick=()=>{ document.body.removeChild(overlay); ask('big_deal'); };
            });
        }

        // Прямой выбор без модалки (для кнопок из других модалок)
        drawFrom(deck){
            const deckId = deck === 'big' ? 'big_deal' : 'deal';
            const card = this.draw(deckId);
            return { deckId, card };
        }

        async showCardAndDecide(deckId, card){
            if(!card) return { action:'none' };
            // Показать всем игрокам через push (если доступно)
            try{ await fetch('/api/push/broadcast', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'deal_card_revealed', data:{ deckId, card } })}); }catch(_){ }
            return new Promise((resolve)=>{
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:4100;display:flex;align-items:center;justify-content:center;';
                const box = document.createElement('div');
                box.style.cssText = 'background:#0b1220;color:#fff;padding:20px;border-radius:12px;min-width:360px;max-width:480px;box-shadow:0 10px 40px rgba(0,0,0,.5)';
                const price = card.value || card.price || 0;
                box.innerHTML = `<div style="font-size:18px;margin-bottom:8px">${card.title||card.name||'Сделка'}</div>
                    <div style="opacity:.85;margin-bottom:16px;white-space:pre-wrap">${card.description||''}</div>
                    <div style="margin-bottom:16px">Цена: $${(price||0).toLocaleString()}</div>
                    <div style="display:flex;gap:12px;justify-content:flex-end">
                        <button id="deal_cancel" class="btn">Отбой</button>
                        <button id="deal_pass" class="btn">Передать право</button>
                        <button id="deal_buy" class="btn btn-primary">Купить</button>
                    </div>`;
                overlay.appendChild(box);
                document.body.appendChild(overlay);
                const cleanup=()=>{ try{document.body.removeChild(overlay);}catch(_){} };
                // Кнопки активны только у активного игрока
                const isMyTurn = window.app?.getModule?.('turnService')?.isMyTurn?.() || false;
                const buyBtn = overlay.querySelector('#deal_buy');
                const passBtn = overlay.querySelector('#deal_pass');
                if(!isMyTurn){ buyBtn.disabled = true; passBtn.disabled = true; buyBtn.title='Не ваш ход'; passBtn.title='Не ваш ход'; }
                overlay.querySelector('#deal_cancel').onclick=()=>{ cleanup(); this.discard(deckId, card); resolve({ action:'discard' }); };
                buyBtn.onclick=()=>{ cleanup(); this.acquire(card); resolve({ action:'buy', card }); };
                passBtn.onclick=()=>{
                    const players = (window.app?.getModule?.('gameState')?.players)||[];
                    const list = document.createElement('div');
                    list.style.cssText = 'margin-top:12px;display:flex;flex-direction:column;gap:6px;';
                    players.forEach(p=>{
                        const b=document.createElement('button');
                        b.className='btn';
                        b.textContent = `Передать: ${p.username||p.name||p.id}`;
                        b.onclick = async ()=>{
                            try{ await fetch('/api/push/broadcast', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'deal_rights_transferred', data:{ to:p.id, card } })}); }catch(_){ }
                            cleanup();
                            resolve({ action:'pass', to:p.id, card });
                        };
                        list.appendChild(b);
                    });
                    box.appendChild(list);
                };
            });
        }
    }

    if(typeof window!== 'undefined') window.DealModule = DealModule;
})();


