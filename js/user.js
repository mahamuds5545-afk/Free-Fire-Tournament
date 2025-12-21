// User Dashboard Manager
class UserManager {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.tournaments = [];
        this.userTournaments = [];
        this.transactions = [];
        this.notifications = [];
        
        this.init();
    }

    async init() {
        // Check if user is logged in
        if (!authManager.isAuthenticated() && !window.location.href.includes('login.html')) {
            window.location.href = 'login.html';
            return;
        }
        
        // Get current user
        this.currentUser = authManager.currentUser;
        await this.loadUserData();
        await this.loadInitialData();
        this.setupRealtimeListeners();
        this.setupEventListeners();
        
        // Show user dashboard
        this.showSection('dashboard');
    }

    // Load user data
    async loadUserData() {
        this.userData = await authManager.getCurrentUserData();
        this.updateUserUI();
    }

    // Load initial data
    async loadInitialData() {
        await Promise.all([
            this.loadTournaments(),
            this.loadTransactions(),
            this.loadNotifications()
        ]);
    }

    // Setup realtime listeners
    setupRealtimeListeners() {
        // User data listener
        database.ref('users/' + this.currentUser.uid).on('value', (snapshot) => {
            this.userData = snapshot.val();
            this.updateUserUI();
        });

        // Tournaments listener
        database.ref('tournaments').on('value', (snapshot) => {
            this.tournaments = [];
            snapshot.forEach((child) => {
                const tournament = child.val();
                tournament.id = child.key;
                this.tournaments.push(tournament);
            });
            
            // Update user tournaments
            this.updateUserTournaments();
            
            // Update UI based on current section
            if (this.currentSection === 'tournaments') {
                this.displayAllTournaments();
            } else if (this.currentSection === 'dashboard') {
                this.displayFeaturedTournaments();
            }
        });

        // Transactions listener
        database.ref('users/' + this.currentUser.uid + '/transactions').on('value', (snapshot) => {
            this.transactions = [];
            snapshot.forEach((child) => {
                const transaction = child.val();
                transaction.id = child.key;
                this.transactions.push(transaction);
            });
            
            if (this.currentSection === 'transactions') {
                this.displayTransactions();
            }
        });

        // Notifications listener
        database.ref('users/' + this.currentUser.uid + '/notifications').on('value', (snapshot) => {
            this.notifications = [];
            let unreadCount = 0;
            
            snapshot.forEach((child) => {
                const notification = child.val();
                notification.id = child.key;
                this.notifications.push(notification);
                
                if (!notification.read) {
                    unreadCount++;
                    this.showNotification(notification);
                }
            });
            
            // Update notification badge
            this.updateNotificationBadge(unreadCount);
        });
    }

    // Setup event listeners
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.user-nav .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Recharge form
        if (document.getElementById('rechargeForm')) {
            document.getElementById('rechargeForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitRechargeRequest();
            });
        }

        // Withdraw form
        if (document.getElementById('withdrawForm')) {
            document.getElementById('withdrawForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitWithdrawRequest();
            });
        }

        // Update profile form
        if (document.getElementById('updateProfileForm')) {
            document.getElementById('updateProfileForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile();
            });
        }

        // Logout
        if (document.getElementById('logoutBtn')) {
            document.getElementById('logoutBtn').addEventListener('click', () => {
                authManager.logout();
            });
        }
    }

    // Show section
    showSection(sectionName) {
        this.currentSection = sectionName;
        
        // Hide all sections
        document.querySelectorAll('.user-section').forEach(section => {
            section.classList.add('d-none');
        });

        // Remove active class from all nav links
        document.querySelectorAll('.user-nav .nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected section
        const section = document.getElementById(sectionName + 'Section');
        if (section) {
            section.classList.remove('d-none');
            
            // Set active nav link
            const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }

            // Load section data
            switch(sectionName) {
                case 'dashboard':
                    this.displayDashboard();
                    break;
                case 'tournaments':
                    this.displayAllTournaments();
                    break;
                case 'my-tournaments':
                    this.displayMyTournaments();
                    break;
                case 'transactions':
                    this.displayTransactions();
                    break;
                case 'profile':
                    this.displayProfile();
                    break;
            }
        }
    }

    // Update user UI
    updateUserUI() {
        if (!this.userData) return;
        
        // Update balance
        document.getElementById('userBalance').textContent = '৳' + (this.userData.balance || 0);
        
        // Update profile info
        const profileElements = document.querySelectorAll('.profile-name');
        profileElements.forEach(el => {
            el.textContent = this.userData.name || 'User';
        });
        
        const ffidElements = document.querySelectorAll('.profile-ffid');
        ffidElements.forEach(el => {
            el.textContent = this.userData.ffid || 'N/A';
        });
    }

    // Update notification badge
    updateNotificationBadge(count) {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }
    }

    // Show notification
    showNotification(notification) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-info';
        toast.innerHTML = `
            <div class="toast-body">
                <strong>${notification.title || 'Notification'}</strong><br>
                ${notification.message}
                ${notification.tournamentId ? `
                    <button class="btn btn-sm btn-success mt-2" onclick="userManager.viewTournamentDetails('${notification.tournamentId}')">
                        View Details
                    </button>
                ` : ''}
            </div>
        `;
        
        document.querySelector('.toast-container').appendChild(toast);
        
        // Mark as read
        database.ref('users/' + this.currentUser.uid + '/notifications/' + notification.id).update({
            read: true
        });
    }

    // Join tournament
    async joinTournament(tournamentId, playMode = 'solo', partnerData = null) {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) {
            showToast('error', 'Tournament not found');
            return;
        }

        // Check if tournament is upcoming
        if (tournament.status !== 'upcoming') {
            showToast('error', 'You can only join upcoming tournaments');
            return;
        }

        // Check if already joined
        const alreadyJoined = await database.ref(`tournaments/${tournamentId}/players/${this.currentUser.uid}`).once('value');
        if (alreadyJoined.exists()) {
            showToast('error', 'You have already joined this tournament');
            return;
        }

        // Calculate entry fee
        let entryFee = tournament.entryFee;
        if (tournament.type === 'duo' && playMode === 'duo') {
            entryFee = tournament.entryFee * 2;
        }

        // Check balance
        if (this.userData.balance < entryFee) {
            showToast('error', 'Insufficient balance');
            return;
        }

        // Prepare player data
        const playerData = {
            userId: this.currentUser.uid,
            username: this.userData.email,
            name: this.userData.name,
            ffid: this.userData.ffid,
            playMode: playMode,
            entryPaid: entryFee,
            joinedAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'joined',
            kills: 0,
            result: null
        };

        if (tournament.type === 'duo' && playMode === 'duo' && partnerData) {
            playerData.partner = partnerData;
        }

        try {
            // Join tournament
            await database.ref(`tournaments/${tournamentId}/players/${this.currentUser.uid}`).set(playerData);
            
            // Update player count
            const newCount = (tournament.joinedPlayers || 0) + 1;
            await database.ref(`tournaments/${tournamentId}`).update({
                joinedPlayers: newCount
            });
            
            // Deduct entry fee
            const newBalance = this.userData.balance - entryFee;
            await database.ref('users/' + this.currentUser.uid).update({
                balance: newBalance
            });
            
            // Add transaction
            await database.ref('users/' + this.currentUser.uid + '/transactions').push({
                type: 'tournament_entry',
                tournamentId: tournamentId,
                tournamentTitle: tournament.title,
                amount: -entryFee,
                status: 'completed',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                playMode: playMode
            });
            
            showToast('success', `Successfully joined tournament! Entry fee ৳${entryFee} deducted.`);
            
            // Close modal if open
            const modal = bootstrap.Modal.getInstance(document.getElementById('joinTournamentModal'));
            if (modal) modal.hide();
            
        } catch (error) {
            showToast('error', error.message);
        }
    }

    // Submit recharge request
    async submitRechargeRequest() {
        const form = document.getElementById('rechargeForm');
        const formData = new FormData(form);
        
        const rechargeData = {
            userId: this.currentUser.uid,
            username: this.userData.email,
            amount: parseInt(formData.get('amount')),
            method: formData.get('method'),
            transactionId: formData.get('transactionId'),
            senderNumber: formData.get('senderNumber'),
            status: 'pending',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        try {
            await database.ref('rechargeRequests').push(rechargeData);
            
            // Add transaction record
            await database.ref('users/' + this.currentUser.uid + '/transactions').push({
                type: 'recharge_request',
                amount: rechargeData.amount,
                method: rechargeData.method,
                status: 'pending',
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            form.reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('rechargeModal'));
            modal.hide();
            
            showToast('success', 'Recharge request submitted successfully!');
        } catch (error) {
            showToast('error', error.message);
        }
    }

    // Submit withdraw request
    async submitWithdrawRequest() {
        const form = document.getElementById('withdrawForm');
        const formData = new FormData(form);
        
        const amount = parseInt(formData.get('amount'));
        const method = formData.get('method');
        const accountNumber = formData.get('accountNumber');
        
        // Check minimum withdrawal
        const settings = await database.ref('settings').once('value');
        const minWithdrawal = settings.val()?.minWithdrawal || 200;
        
        if (amount < minWithdrawal) {
            showToast('error', `Minimum withdrawal amount is ৳${minWithdrawal}`);
            return;
        }
        
        if (this.userData.balance < amount) {
            showToast('error', 'Insufficient balance');
            return;
        }

        const withdrawData = {
            userId: this.currentUser.uid,
            username: this.userData.email,
            amount: amount,
            method: method,
            accountNumber: accountNumber,
            status: 'pending',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        try {
            await database.ref('withdrawRequests').push(withdrawData);
            
            // Add transaction record
            await database.ref('users/' + this.currentUser.uid + '/transactions').push({
                type: 'withdrawal_request',
                amount: -amount,
                method: method,
                status: 'pending',
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            form.reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('withdrawModal'));
            modal.hide();
            
            showToast('success', 'Withdrawal request submitted!');
        } catch (error) {
            showToast('error', error.message);
        }
    }

    // Update profile
    async updateProfile() {
        const form = document.getElementById('updateProfileForm');
        const formData = new FormData(form);
        
        const updates = {
            name: formData.get('name'),
            ffid: formData.get('ffid'),
            phone: formData.get('phone')
        };

        try {
            await authManager.updateProfile(updates);
            form.reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('updateProfileModal'));
            modal.hide();
            
            showToast('success', 'Profile updated successfully!');
        } catch (error) {
            showToast('error', error.message);
        }
    }

    // View room details
    async viewRoomDetails(tournamentId) {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) return;
        
        // Check if user has joined
        const playerSnap = await database.ref(`tournaments/${tournamentId}/players/${this.currentUser.uid}`).once('value');
        if (!playerSnap.exists()) {
            showToast('error', 'You have not joined this tournament');
            return;
        }
        
        if (tournament.status === 'live' && tournament.roomId) {
            const modal = new bootstrap.Modal(document.getElementById('roomDetailsModal'));
            
            document.getElementById('roomId').textContent = tournament.roomId;
            document.getElementById('roomPassword').textContent = tournament.password;
            document.getElementById('tournamentTitle').textContent = tournament.title;
            
            modal.show();
        } else {
            showToast('info', 'Room details will be available when tournament goes live');
        }
    }

    // Display dashboard
    displayDashboard() {
        this.displayFeaturedTournaments();
        this.updateUserUI();
    }

    // Display featured tournaments
    displayFeaturedTournaments() {
        const container = document.getElementById('featuredTournaments');
        if (!container) return;
        
        const upcoming = this.tournaments
            .filter(t => t.status === 'upcoming')
            .slice(0, 3);
        
        let html = '';
        upcoming.forEach(tournament => {
            const isJoined = this.userTournaments.some(ut => ut.id === tournament.id);
            
            html += `
                <div class="col-md-4 mb-3">
                    <div class="tournament-card-user">
                        <span class="type-badge type-${tournament.type}">${tournament.type}</span>
                        ${tournament.status === 'live' ? '<span class="live-badge">LIVE</span>' : ''}
                        
                        <h6>${tournament.title}</h6>
                        <p class="small mb-1"><i class="fas fa-calendar"></i> ${new Date(tournament.schedule).toLocaleDateString()}</p>
                        <p class="small mb-1"><i class="fas fa-ticket-alt"></i> Entry: ৳${tournament.entryFee}</p>
                        <p class="small mb-2"><i class="fas fa-trophy"></i> Prize: ৳${tournament.prize}</p>
                        
                        <button class="btn btn-ff btn-sm w-100" 
                                onclick="userManager.showJoinModal('${tournament.id}')"
                                ${isJoined ? 'disabled' : ''}>
                            ${isJoined ? 'Joined' : 'Join Now'}
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<div class="col-12"><p class="text-center">No upcoming tournaments</p></div>';
    }

    // Display all tournaments
    displayAllTournaments() {
        const container = document.getElementById('allTournaments');
        if (!container) return;
        
        let html = '';
        this.tournaments.forEach(tournament => {
            const isJoined = this.userTournaments.some(ut => ut.id === tournament.id);
            
            html += `
                <div class="col-md-6 mb-3">
                    <div class="tournament-card-user">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6>${tournament.title}</h6>
                                <p class="small text-muted mb-1">
                                    <i class="fas fa-calendar"></i> ${new Date(tournament.schedule).toLocaleDateString()}
                                </p>
                            </div>
                            <span class="badge-status badge-${tournament.status}">
                                ${tournament.status}
                            </span>
                        </div>
                        
                        <div class="row mt-2">
                            <div class="col-6">
                                <p class="small mb-1"><i class="fas fa-ticket-alt"></i> Entry: ৳${tournament.entryFee}</p>
                                <p class="small mb-1"><i class="fas fa-users"></i> Players: ${tournament.joinedPlayers || 0}/${tournament.maxPlayers || 0}</p>
                            </div>
                            <div class="col-6">
                                <p class="small mb-1"><i class="fas fa-trophy"></i> Prize: ৳${tournament.prize}</p>
                                <p class="small mb-1"><i class="fas fa-skull"></i> Kill: ৳${tournament.killReward}</p>
                            </div>
                        </div>
                        
                        <div class="btn-group w-100 mt-2">
                            ${isJoined ? 
                                `<button class="btn btn-success btn-sm" onclick="userManager.viewJoinedTournament('${tournament.id}')">
                                    View Details
                                </button>` :
                                `<button class="btn btn-ff btn-sm" onclick="userManager.showJoinModal('${tournament.id}')">
                                    Join Tournament
                                </button>`
                            }
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = `<div class="row">${html}</div>` || '<p class="text-center">No tournaments available</p>';
    }

    // Display user's tournaments
    displayMyTournaments() {
        const container = document.getElementById('myTournaments');
        if (!container) return;
        
        let html = '';
        this.userTournaments.forEach(tournament => {
            html += `
                <div class="col-md-6 mb-3">
                    <div class="tournament-card-user">
                        <h6>${tournament.title}</h6>
                        <p class="small mb-1">
                            <span class="badge-status badge-${tournament.status}">${tournament.status}</span>
                            <span class="type-badge type-${tournament.type} ms-1">${tournament.type}</span>
                        </p>
                        <p class="small mb-1"><i class="fas fa-calendar"></i> ${new Date(tournament.schedule).toLocaleString()}</p>
                        <p class="small mb-1">Entry Paid: <span class="text-success">৳${tournament.entryPaid}</span></p>
                        
                        ${tournament.status === 'live' && tournament.roomId ? `
                            <button class="btn btn-success btn-sm w-100 mt-2" onclick="userManager.viewRoomDetails('${tournament.id}')">
                                <i class="fas fa-door-open"></i> View Room
                            </button>
                        ` : ''}
                        
                        ${tournament.status === 'completed' ? `
                            <button class="btn btn-info btn-sm w-100 mt-2" onclick="userManager.viewResults('${tournament.id}')">
                                <i class="fas fa-eye"></i> View Results
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = `<div class="row">${html}</div>` || '<p class="text-center">You have not joined any tournaments</p>';
    }

    // Display transactions
    displayTransactions() {
        const container = document.getElementById('transactionsList');
        if (!container) return;
        
        const sortedTransactions = this.transactions.sort((a, b) => b.timestamp - a.timestamp);
        
        let html = '';
        sortedTransactions.forEach(transaction => {
            const amountClass = transaction.amount > 0 ? 'text-success' : 'text-danger';
            const amountSign = transaction.amount > 0 ? '+' : '';
            
            html += `
                <tr>
                    <td>${new Date(transaction.timestamp).toLocaleString()}</td>
                    <td>${this.formatTransactionType(transaction.type)}</td>
                    <td class="${amountClass}">${amountSign}৳${Math.abs(transaction.amount)}</td>
                    <td><span class="badge-status badge-${transaction.status}">${transaction.status}</span></td>
                </tr>
            `;
        });
        
        container.innerHTML = html || '<tr><td colspan="4" class="text-center">No transactions found</td></tr>';
    }

    // Format transaction type
    formatTransactionType(type) {
        const types = {
            'recharge_request': 'Recharge',
            'withdrawal_request': 'Withdrawal',
            'tournament_entry': 'Tournament Entry',
            'tournament_winning': 'Tournament Winning',
            'kill_reward': 'Kill Reward',
            'admin_added': 'Admin Added'
        };
        return types[type] || type;
    }

    // Display profile
    displayProfile() {
        if (!this.userData) return;
        
        document.getElementById('profileName').textContent = this.userData.name || 'N/A';
        document.getElementById('profileEmail').textContent = this.userData.email || 'N/A';
        document.getElementById('profileFFID').textContent = this.userData.ffid || 'N/A';
        document.getElementById('profilePhone').textContent = this.userData.phone || 'N/A';
        document.getElementById('profileJoinDate').textContent = new Date(this.userData.joinDate).toLocaleDateString();
        
        // Stats
        document.getElementById('profileKills').textContent = this.userData.kills || 0;
        document.getElementById('profileWins').textContent = this.userData.wins || 0;
        document.getElementById('profileMatches').textContent = this.userData.matches || 0;
    }

    // Load tournaments
    async loadTournaments() {
        const snapshot = await database.ref('tournaments').once('value');
        if (snapshot.exists()) {
            this.tournaments = [];
            snapshot.forEach((child) => {
                const tournament = child.val();
                tournament.id = child.key;
                this.tournaments.push(tournament);
            });
            
            this.updateUserTournaments();
        }
    }

    // Update user tournaments
    async updateUserTournaments() {
        this.userTournaments = [];
        
        for (const tournament of this.tournaments) {
            const playerSnap = await database.ref(`tournaments/${tournament.id}/players/${this.currentUser.uid}`).once('value');
            if (playerSnap.exists()) {
                const playerData = playerSnap.val();
                this.userTournaments.push({
                    ...tournament,
                    entryPaid: playerData.entryPaid,
                    playMode: playerData.playMode,
                    playerStatus: playerData.status
                });
            }
        }
    }

    // Load transactions
    async loadTransactions() {
        const snapshot = await database.ref('users/' + this.currentUser.uid + '/transactions').once('value');
        if (snapshot.exists()) {
            this.transactions = [];
            snapshot.forEach((child) => {
                const transaction = child.val();
                transaction.id = child.key;
                this.transactions.push(transaction);
            });
        }
    }

    // Load notifications
    async loadNotifications() {
        const snapshot = await database.ref('users/' + this.currentUser.uid + '/notifications').once('value');
        if (snapshot.exists()) {
            this.notifications = [];
            snapshot.forEach((child) => {
                const notification = child.val();
                notification.id = child.key;
                this.notifications.push(notification);
            });
        }
    }

    // Show join modal
    showJoinModal(tournamentId) {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) return;
        
        const modal = new bootstrap.Modal(document.getElementById('joinTournamentModal'));
        
        // Update modal content
        document.getElementById('modalTournamentTitle').textContent = tournament.title;
        document.getElementById('modalEntryFee').textContent = tournament.entryFee;
        document.getElementById('modalPrizePool').textContent = tournament.prize;
        document.getElementById('modalKillReward').textContent = tournament.killReward;
        document.getElementById('modalMaxPlayers').textContent = tournament.maxPlayers;
        document.getElementById('modalJoinedPlayers').textContent = tournament.joinedPlayers || 0;
        document.getElementById('modalSchedule').textContent = new Date(tournament.schedule).toLocaleString();
        
        // Store tournament ID for join button
        document.getElementById('joinTournamentBtn').onclick = () => {
            const playMode = tournament.type === 'duo' ? 
                document.querySelector('input[name="playMode"]:checked').value : 'solo';
            
            let partnerData = null;
            if (tournament.type === 'duo' && playMode === 'duo') {
                const partnerName = document.getElementById('partnerName').value;
                const partnerFFID = document.getElementById('partnerFFID').value;
                
                if (!partnerName || !partnerFFID) {
                    showToast('error', 'Please fill partner details for duo mode');
                    return;
                }
                
                partnerData = { name: partnerName, ffid: partnerFFID };
            }
            
            this.joinTournament(tournamentId, playMode, partnerData);
        };
        
        // Show duo fields if tournament type is duo
        const duoFields = document.getElementById('duoFields');
        if (tournament.type === 'duo') {
            duoFields.classList.remove('d-none');
        } else {
            duoFields.classList.add('d-none');
        }
        
        modal.show();
    }

    // View joined tournament details
    async viewJoinedTournament(tournamentId) {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) return;
        
        const playerSnap = await database.ref(`tournaments/${tournamentId}/players/${this.currentUser.uid}`).once('value');
        if (!playerSnap.exists()) {
            showToast('error', 'You have not joined this tournament');
            return;
        }
        
        const playerData = playerSnap.val();
        const modal = new bootstrap.Modal(document.getElementById('joinedTournamentModal'));
        
        document.getElementById('joinedTournamentTitle').textContent = tournament.title;
        document.getElementById('joinedTournamentStatus').textContent = tournament.status;
        document.getElementById('joinedEntryPaid').textContent = playerData.entryPaid;
        document.getElementById('joinedPlayMode').textContent = playerData.playMode;
        
        if (tournament.status === 'live' && tournament.roomId) {
            document.getElementById('roomDetailsBtn').classList.remove('d-none');
            document.getElementById('roomDetailsBtn').onclick = () => this.viewRoomDetails(tournamentId);
        } else {
            document.getElementById('roomDetailsBtn').classList.add('d-none');
        }
        
        modal.show();
    }
}

// Initialize User Manager
let userManager;

document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.user-dashboard')) {
        userManager = new UserManager();
    }
});
