class TrelloClone {
    constructor() {
        this.currentBoardId = localStorage.getItem('currentBoardId') || null;
        this.boards = JSON.parse(localStorage.getItem('boards')) || [];
        this.labelColors = ['green', 'yellow','red', 'purple', 'blue'];
        this.pendingListId = null;
        this.pendingCardId = null;
        this.pendingDeleteType = null;
        this.pendingDeleteId = null;
        this.draggedCard = null;
        this.draggedCardId = null;
        this.sourceListId = null;
        this.defaultLists = ['To Do', 'In Progress', 'Completed development', 'Ready for release'];
        this.init();
    }

    init() {
        this.renderBoardsModal();
        this.loadCurrentBoard();
        this.bindEvents();
        if (!this.currentBoardId) {
            this.createDefaultBoard();
        }
    }

    createDefaultBoard() {
        const now = Date.now();
        const defaultBoard = {
            id: now,
            name: 'My Trello Board',
            lists: [
                { id: now + 1, name: 'To Do', cards: [
                     { id: now + 10, title: 'Start using Trello', desc: '', image: '', labels: [] }
                ] },
                { id: now + 2, name: 'In Progress', cards: [
                   
                    { id: now + 11, title: 'Capture from email, Slack, and Teams', desc: '', image: '', labels: [] },
                    { id: now + 12, title: 'New to Trello? Start here', desc: '', image: '', labels: ['blue'] }
                ] },
                { id: now + 3, name: 'Completed development', cards: [
                     { id: now + 13, title: 'Kozhikode Metro', desc: '', image: 'https://img.staticmb.com/mbcontent/images/crop/uploads/2023/3/Hyderabad-Metro_0_1200.jpg.webp', labels: ['blue'] }
                ] },
                { id: now + 4, name: 'Ready for release', cards: [
                    { id: now + 14, title: 'Grand I10 Delivery', desc: '', image: 'https://www.hyundai.com/content/dam/hyundai/in/en/data/home/homemodel-nios.png', labels: ['red'] }

                ] }
            ]
        };
        this.boards.push(defaultBoard);
        this.currentBoardId = defaultBoard.id;
        this.saveData();
        this.loadCurrentBoard();
    }

    saveData() {
        localStorage.setItem('boards', JSON.stringify(this.boards));
        localStorage.setItem('currentBoardId', this.currentBoardId);
    }

    loadCurrentBoard() {
        if (!this.currentBoardId) return;
        const board = this.boards.find(b => b.id === parseInt(this.currentBoardId));
        if (!board) return;
        
        const boardTitleEl = document.getElementById('board-title');
        boardTitleEl.innerHTML = `
            <div class="board-title-wrapper">
                <span class="board-name-display">${board.name}</span>
                <button class="edit-board-btn" data-action="edit-board" title="Edit board name">Rename</button>
                <button class="delete-board-btn" data-action="delete-board" title="Delete board">Delete</button>
            </div>
        `;
        
        
        const editBtn = boardTitleEl.querySelector('[data-action="edit-board"]');
        const deleteBtn = boardTitleEl.querySelector('[data-action="delete-board"]');
        if (editBtn) editBtn.addEventListener('click', () => this.showEditBoardModal());
        if (deleteBtn) deleteBtn.addEventListener('click', () => this.showDeleteBoardModal());
        
        const switchBtn = document.getElementById('switch-boards-btn');
        if (switchBtn) {
            switchBtn.innerHTML = '🔀 Switch Boards';
        }
        
        const container = document.getElementById('lists-container');
        container.innerHTML = '';
        board.lists.forEach((list, index) => {
            const listEl = this.createListElement(list);
            container.appendChild(listEl);
            setTimeout(() => listEl.style.animationDelay = `${index * 0.1}s`, 0);
        });
    }

    createListElement(list) {
        const listDiv = document.createElement('div');
        listDiv.className = 'list';
        listDiv.dataset.listId = list.id;
        listDiv.style.animation = 'fadeInUp 0.6s ease forwards';
        
        listDiv.innerHTML = `
            <div class="list-header">
                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                    <span class="list-title" id="list-title-${list.id}">${list.name}</span>
                    <button class="edit-icon-btn" data-action="edit-list" data-list-id="${list.id}" title="Edit list name">✏️</button>
                </div>
                <div class="list-actions">
                    <button data-action="add-card" data-list-id="${list.id}">+</button>
                    <button data-action="delete-list" data-list-id="${list.id}">×</button>
                </div>
            </div>
            <div class="cards-container" data-list-id="${list.id}">
            </div>
            <button class="add-card-btn" data-action="add-card" data-list-id="${list.id}">+ Add a card</button>
        `;
        
        listDiv.querySelector('[data-action="edit-list"]').addEventListener('click', () => this.showEditListModal(list.id));
        listDiv.querySelectorAll('[data-action="add-card"]').forEach(btn => {
            btn.addEventListener('click', () => this.showAddCardModal(list.id));
        });
        listDiv.querySelector('[data-action="delete-list"]').addEventListener('click', () => {
            this.showDeleteModal('list', list.id, 'Are you sure you want to delete this list?');
        });
        
        // Add cards to container
        const cardsContainer = listDiv.querySelector('.cards-container');
        list.cards.forEach(card => {
            const cardElement = this.createCardElement(card);
            cardsContainer.appendChild(cardElement);
        });
        
        this.setupDropZone(cardsContainer);
        
        return listDiv;
    }

    createCardElement(card) {
        const labelsHtml = card.labels ? card.labels.map(label => `<span class="label ${label}">${label}</span>`).join('') : '';
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.draggable = true;
        cardDiv.dataset.cardId = card.id;
        
        cardDiv.innerHTML = `
            ${card.image ? `<img class="card-image" src="${card.image}" alt="Card image">` : ''}
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
                <div class="card-title" id="card-title-${card.id}">${card.title}</div>
                <button class="edit-icon-btn-small" data-action="edit-card" data-card-id="${card.id}" title="Edit title">✏️</button>
            </div>
            <div class="card-desc" contenteditable="true" id="card-desc-${card.id}">${card.desc || 'Click to add description...'}</div>
            <div class="card-labels">${labelsHtml}</div>
            <div class="card-actions">
                <button data-action="edit-image" data-card-id="${card.id}" title="Edit image">📷</button>
                <button data-action="manage-labels" data-card-id="${card.id}" title="Manage labels">🏷️</button>
                <button data-action="delete-card" data-card-id="${card.id}" title="Delete card">🗑️</button>
            </div>
        `;
        
       
        const descEl = cardDiv.querySelector('.card-desc');
        descEl.addEventListener('blur', (e) => this.updateCardDesc(card.id, e.target.textContent));
        
        cardDiv.querySelector('[data-action="edit-card"]').addEventListener('click', () => this.showEditCardTitleModal(card.id));
        cardDiv.querySelector('[data-action="edit-image"]').addEventListener('click', () => this.showEditImageModal(card.id));
        cardDiv.querySelector('[data-action="manage-labels"]').addEventListener('click', () => this.showLabelsModal(card.id));
        cardDiv.querySelector('[data-action="delete-card"]').addEventListener('click', () => {
            this.showDeleteModal('card', card.id, 'Are you sure you want to delete this card?');
        });
        
       
        return cardDiv;
    }

    updateCardDesc(cardId, newDesc) {
        const card = this.getCardById(cardId);
        if (card) {
            card.desc = newDesc.trim();
            this.saveData();
        }
    }

    setupDropZone(container) {
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!this.draggedCard) return;
            
            container.classList.add('drag-over');
            
            const afterElement = this.getDragAfterElement(container, e.clientY);
            const draggable = this.draggedCard;
            
            if (afterElement == null) {
                container.appendChild(draggable);
            } else {
                container.insertBefore(draggable, afterElement);
            }
        });

        container.addEventListener('dragleave', (e) => {
            if (e.target === container) {
                container.classList.remove('drag-over');
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.classList.remove('drag-over');
            
            if (!this.draggedCardId) return;
            
            const targetListId = parseInt(container.dataset.listId);
            this.moveCard(this.sourceListId, targetListId, this.draggedCardId);
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    moveCard(fromListId, toListId, cardId) {
        const board = this.boards.find(b => b.id === parseInt(this.currentBoardId));
        if (!board) return;
        
        const fromList = board.lists.find(l => l.id === fromListId);
        const toList = board.lists.find(l => l.id === toListId);
        
        if (!fromList || !toList) return;
        
        const cardIndex = fromList.cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;
        
        const card = fromList.cards[cardIndex];
        fromList.cards.splice(cardIndex, 1);
        
        const cardElements = [...document.querySelector(`[data-list-id="${toListId}"]`).querySelectorAll('.card')];
        const draggedCardElement = cardElements.find(el => parseInt(el.dataset.cardId) === cardId);
        const insertIndex = draggedCardElement ? cardElements.indexOf(draggedCardElement) : toList.cards.length;
        
        toList.cards.splice(insertIndex, 0, card);
        
        this.saveData();
    }

    getCardById(cardId) {
        const board = this.boards.find(b => b.id === parseInt(this.currentBoardId));
        return board ? board.lists.flatMap(l => l.cards).find(c => c.id === cardId) : null;
    }

    showEditBoardModal() {
        const board = this.boards.find(b => b.id === parseInt(this.currentBoardId));
        if (!board) return;
        
        const modal = document.getElementById('add-board-modal');
        const input = document.getElementById('board-name-input');
        const title = modal.querySelector('h2');
        const saveBtn = document.getElementById('save-board-btn');
        
        title.textContent = 'Edit Board Name';
        input.value = board.name;
        saveBtn.textContent = 'Save';
        
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', () => this.saveEditedBoardName());
        
        modal.classList.remove('hidden');
        input.focus();
        input.select();
    }

    saveEditedBoardName() {
        const name = document.getElementById('board-name-input').value.trim();
        if (!name) return;
        
        const board = this.boards.find(b => b.id === parseInt(this.currentBoardId));
        board.name = name;
        
        this.saveData();
        this.loadCurrentBoard();
        this.renderBoardsModal();
        this.hideAddBoardModal();
    }

    showDeleteBoardModal() {
        if (this.boards.length <= 1) {
            alert('Cannot delete the last board!');
            return;
        }
        
        this.showDeleteModal('board', this.currentBoardId, 'Are you sure you want to delete this board? All lists and cards will be permanently deleted.');
    }

    deleteCurrentBoard() {
        const index = this.boards.findIndex(b => b.id === parseInt(this.currentBoardId));
        if (index > -1) {
            this.boards.splice(index, 1);
            this.currentBoardId = this.boards[0].id;
            this.saveData();
            this.loadCurrentBoard();
            this.renderBoardsModal();
        }
    }

    showEditListModal(listId) {
        const board = this.boards.find(b => b.id === parseInt(this.currentBoardId));
        const list = board.lists.find(l => l.id === listId);
        
        const modal = document.getElementById('add-list-modal');
        const input = document.getElementById('list-name-input');
        const title = modal.querySelector('h2');
        const saveBtn = document.getElementById('save-list-btn');
        
        title.textContent = 'Edit List Name';
        input.value = list.name;
        saveBtn.textContent = 'Save';
        
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', () => this.saveEditedListName(listId));
        
        modal.classList.remove('hidden');
        input.focus();
        input.select();
    }

    saveEditedListName(listId) {
        const name = document.getElementById('list-name-input').value.trim();
        if (!name) return;
        
        const board = this.boards.find(b => b.id === parseInt(this.currentBoardId));
        const list = board.lists.find(l => l.id === listId);
        list.name = name;
        
        this.saveData();
        this.loadCurrentBoard();
        this.hideAddListModal();
    }

    showEditCardTitleModal(cardId) {
        const card = this.getCardById(cardId);
        if (!card) return;
        
        const modal = document.getElementById('add-card-modal');
        const titleInput = document.getElementById('card-title-input');
        const descInput = document.getElementById('card-desc-input');
        const imageInput = document.getElementById('card-image-input');
        const title = modal.querySelector('h2');
        const saveBtn = document.getElementById('save-card-btn');
        
        title.textContent = 'Edit Card';
        titleInput.value = card.title;
        descInput.value = card.desc;
        imageInput.value = card.image;
        saveBtn.textContent = 'Save Changes';
        
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', () => this.saveEditedCard(cardId));
        
        modal.classList.remove('hidden');
        titleInput.focus();
        titleInput.select();
    }

    saveEditedCard(cardId) {
        const title = document.getElementById('card-title-input').value.trim();
        const desc = document.getElementById('card-desc-input').value.trim();
        const image = document.getElementById('card-image-input').value.trim();
        
        if (!title) return;
        
        const card = this.getCardById(cardId);
        card.title = title;
        card.desc = desc;
        card.image = image;
        
        this.saveData();
        this.loadCurrentBoard();
        this.hideAddCardModal();
    }

    showEditImageModal(cardId) {
        const card = this.getCardById(cardId);
        if (!card) return;
        
        const modal = document.getElementById('add-card-modal');
        const titleInput = document.getElementById('card-title-input');
        const descInput = document.getElementById('card-desc-input');
        const imageInput = document.getElementById('card-image-input');
        const title = modal.querySelector('h2');
        const saveBtn = document.getElementById('save-card-btn');
        
        title.textContent = 'Edit Image';
        titleInput.value = card.title;
        descInput.value = card.desc;
        imageInput.value = card.image;
        saveBtn.textContent = 'Save';
        
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', () => this.saveEditedCard(cardId));
        
        modal.classList.remove('hidden');
        imageInput.focus();
        imageInput.select();
    }

    showAddBoardModal() {
        const modal = document.getElementById('add-board-modal');
        const input = document.getElementById('board-name-input');
        const title = modal.querySelector('h2');
        const saveBtn = document.getElementById('save-board-btn');
        
        title.textContent = 'Create New Board';
        input.value = '';
        saveBtn.textContent = 'Create';
        
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', () => this.createBoardFromModal());
        
        modal.classList.remove('hidden');
        input.focus();
    }

    hideAddBoardModal() {
        document.getElementById('add-board-modal').classList.add('hidden');
    }

    createBoardFromModal() {
        const name = document.getElementById('board-name-input').value.trim();
        if (!name) return;
        const newBoard = {
            id: Date.now(),
            name,
            lists: []
        };
        this.boards.push(newBoard);
        this.saveData();
        this.renderBoardsModal();
        this.switchBoard(newBoard.id);
        this.hideAddBoardModal();
    }

    showAddListModal() {
        const modal = document.getElementById('add-list-modal');
        const title = modal.querySelector('h2');
        const saveBtn = document.getElementById('save-list-btn');
        const input = document.getElementById('list-name-input');
        
        title.textContent = 'Add List';
        input.value = '';
        saveBtn.textContent = 'Add List';
        
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', () => this.addListFromModal());
        
        modal.classList.remove('hidden');
        input.focus();
    }

    hideAddListModal() {
        document.getElementById('add-list-modal').classList.add('hidden');
    }

    addListFromModal() {
        const name = document.getElementById('list-name-input').value.trim() || 'New List';
        const newList = { id: Date.now(), name, cards: [] };
        const board = this.boards.find(b => b.id === parseInt(this.currentBoardId));
        board.lists.push(newList);
        this.saveData();
        this.loadCurrentBoard();
        this.hideAddListModal();
    }

    showAddCardModal(listId) {
        this.pendingListId = listId;
        const modal = document.getElementById('add-card-modal');
        const title = modal.querySelector('h2');
        const saveBtn = document.getElementById('save-card-btn');
        
        title.textContent = 'Add Card';
        saveBtn.textContent = 'Add Card';
        
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', () => this.addCardFromModal());
        
        document.getElementById('card-title-input').value = '';
        document.getElementById('card-desc-input').value = '';
        document.getElementById('card-image-input').value = '';
        modal.classList.remove('hidden');
        document.getElementById('card-title-input').focus();
    }

    hideAddCardModal() {
        document.getElementById('add-card-modal').classList.add('hidden');
        this.pendingListId = null;
        this.pendingCardId = null;
    }

    addCardFromModal() {
        if (!this.pendingListId) return;
        const title = document.getElementById('card-title-input').value.trim() || 'New Card';
        const desc = document.getElementById('card-desc-input').value.trim();
        const image = document.getElementById('card-image-input').value.trim();
        const newCard = { id: Date.now(), title, desc, image, labels: [] };
        const board = this.boards.find(b => b.id === parseInt(this.currentBoardId));
        const list = board.lists.find(l => l.id === this.pendingListId);
        list.cards.push(newCard);
        this.saveData();
        this.loadCurrentBoard();
        this.hideAddCardModal();
    }

    showLabelsModal(cardId) {
        this.pendingCardId = cardId;
        const card = this.getCardById(cardId);
        if (!card) return;
        const container = document.getElementById('labels-list');
        container.innerHTML = this.labelColors.map(color => `
            <label class="label-checkbox">
                <input type="checkbox" value="${color}" ${card.labels.includes(color) ? 'checked' : ''}>
                <span class="label ${color}">${color}</span>
            </label>
        `).join('');
        document.getElementById('labels-modal').classList.remove('hidden');
    }

    hideLabelsModal() {
        document.getElementById('labels-modal').classList.add('hidden');
        this.pendingCardId = null;
    }

    saveLabelsFromModal() {
        if (!this.pendingCardId) return;
        const container = document.getElementById('labels-list');
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
        const labels = Array.from(checkboxes).map(cb => cb.value);
        const card = this.getCardById(this.pendingCardId);
        card.labels = labels;
        this.saveData();
        this.loadCurrentBoard();
        this.hideLabelsModal();
    }

    showDeleteModal(type, id, message) {
        this.pendingDeleteType = type;
        this.pendingDeleteId = id;
        document.getElementById('delete-message').textContent = message;
        document.getElementById('delete-modal').classList.remove('hidden');
    }

    hideDeleteModal() {
        document.getElementById('delete-modal').classList.add('hidden');
        this.pendingDeleteType = null;
        this.pendingDeleteId = null;
    }

    confirmDelete() {
        if (!this.pendingDeleteType || !this.pendingDeleteId) return;
        
        if (this.pendingDeleteType === 'board') {
            this.deleteCurrentBoard();
        } else {
            const board = this.boards.find(b => b.id === parseInt(this.currentBoardId));
            if (this.pendingDeleteType === 'card') {
                for (let list of board.lists) {
                    const index = list.cards.findIndex(c => c.id === this.pendingDeleteId);
                    if (index > -1) {
                        list.cards.splice(index, 1);
                        break;
                    }
                }
            } else if (this.pendingDeleteType === 'list') {
                const index = board.lists.findIndex(l => l.id === this.pendingDeleteId);
                if (index > -1) {
                    board.lists.splice(index, 1);
                }
            }
            this.saveData();
            this.loadCurrentBoard();
        }
        
        this.hideDeleteModal();
    }

    bindEvents() {
        document.getElementById('switch-boards-btn').addEventListener('click', () => {
            document.getElementById('board-modal').classList.remove('hidden');
        });

        document.getElementById('close-board-modal').addEventListener('click', () => {
            document.getElementById('board-modal').classList.add('hidden');
        });

        document.getElementById('create-board-btn').addEventListener('click', () => this.showAddBoardModal());
        document.getElementById('cancel-board-btn').addEventListener('click', () => this.hideAddBoardModal());
        document.getElementById('cancel-list-btn').addEventListener('click', () => this.hideAddListModal());
        document.getElementById('cancel-card-btn').addEventListener('click', () => this.hideAddCardModal());
        document.getElementById('save-labels-btn').addEventListener('click', () => this.saveLabelsFromModal());
        document.getElementById('cancel-labels-btn').addEventListener('click', () => this.hideLabelsModal());
        document.getElementById('confirm-delete-btn').addEventListener('click', () => this.confirmDelete());
        document.getElementById('cancel-delete-btn').addEventListener('click', () => this.hideDeleteModal());
        
        
        const addListBtn = document.getElementById('add-list-main-btn');
        if (addListBtn) {
            addListBtn.addEventListener('click', () => this.showAddListModal());
        }
        
        // Footer switch button
        const footerSwitchBtn = document.getElementById('footer-switch-btn');
        if (footerSwitchBtn) {
            footerSwitchBtn.addEventListener('click', () => {
                document.getElementById('board-modal').classList.remove('hidden');
            });
        }
        
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('card')) {
                this.draggedCard = e.target;
                this.draggedCardId = parseInt(e.target.dataset.cardId);
                const listContainer = e.target.closest('[data-list-id]');
                this.sourceListId = parseInt(listContainer.dataset.listId);
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            }
        });
        
        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('card')) {
                e.target.classList.remove('dragging');
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                this.draggedCard = null;
                this.draggedCardId = null;
                this.sourceListId = null;
            }
        });
    }

    renderBoardsModal() {
        const list = document.getElementById('board-list');
        list.innerHTML = '';
        this.boards.forEach(board => {
            const li = document.createElement('li');
            li.textContent = board.name;
            li.addEventListener('click', () => this.switchBoard(board.id));
            list.appendChild(li);
        });
    }

    switchBoard(boardId) {
        this.currentBoardId = boardId;
        this.saveData();
        this.loadCurrentBoard();
        document.getElementById('board-modal').classList.add('hidden');
    }
}

const trello = new TrelloClone();