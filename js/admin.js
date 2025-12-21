// Admin Dashboard Manager
class AdminManager {
    constructor() {
        this.tournaments = [];
        this.users = [];
        this.rechargeRequests = [];
        this.withdrawRequests = [];
        this.notices = [];
        this.stats = {
            totalUsers: 0,
            totalTournaments: 0,
            totalRevenue: 0,
            pendingRequests: 0
        };
        
        this.init();
    }

    async init() {
        // Check if user is admin
        if (!authManager.isAdmin() && !window.location.href.includes('login.html')) {
            window.location.href = 'login.html';
            return;
        }
        
        // Load all data
        await this.loadDashboardData();
        this.setupRealtimeListeners();
        this.setupEventListeners();
    }

    // Load dashboard data
    async loadDashboardData() {
        await Promise.all([
            this.loadUsers(),
            this.loadTournaments(),
            this.loadRechargeRequests(),
            this.loadWithdrawRequests(),
            this.loadNotices(),
            this.loadSettings()
        ]);
        
        this.updateStats();
        this.displayDashboard();
    }

    // Setup realtime listeners
    setupRealtimeListeners() {
        // Users listener
        database.ref('users').on('value', (snapshot) => {
            this.users = [];
            snapshot.forEach((child) => {
                const user = child.val();
                user.uid = child.key;
                this.users.push(user);
            });
            this.updateStats();
            if (this.isSectionVisible('users')) {
                this.displayUsers();
            }
        });

        // Tournaments listener
        database.ref('tournaments').on('value', (snapshot) => {
            this.tournaments = [];
            snapshot.forEach((child) => {
                const tournament = child.val();
                tournament.id = child.key;
                this.tournaments.push(tournament);
            });
            this.updateStats();
            this.autoUpdateTournamentStatus();
            
            if (this.isSectionVisible('tournaments')) {
                this.displayTournaments();
            }
            if (this.isSectionVisible('dashboard')) {
                this.displayRecentTournaments();
            }
        });

        // Recharge requests listener
        database.ref('rechargeRequests').on('value', (snapshot) => {
            this.rechargeRequests = [];
            snapshot.forEach((child) => {
                const request = child.val();
                request.id = child.key;
                this.rechargeRequests.push(request);
            });
            this.updateStats();
            if (this.isSectionVisible('recharge')) {
                this.displayRechargeRequests();
            }
        });

        // Withdraw requests listener
        database.ref('withdrawRequests').on('value', (snapshot) => {
            this.withdrawRequests = [];
            snapshot.forEach((child) => {
                const request = child.val();
                request.id = child.key;
                this.withdrawRequests.push(request);
            });
            this.updateStats();
            if (this.isSectionVisible('withdraw')) {
                this.displayWithdrawRequests();
            }
        });

        // Notices listener
        database.ref('notices').on('value', (snapshot) => {
            this.notices = [];
            snapshot.forEach((child) => {
                const notice = child.val();
                notice.id = child.key;
                this.notices.push(notice);
            });
            if (this.isSectionVisible('notices')) {
                this.displayNotices();
            }
        });
    }

    // Setup DOM event listeners
    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.admin-sidebar .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Create tournament form
        if (document.getElementById('createTournamentForm')) {
            document.getElementById('createTournamentForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.createTournament();
            });
        }

        // Search functionality
        if (document.getElementById('searchUsers')) {
            document.getElementById('searchUsers').addEventListener('input', () => {
                this.displayUsers();
            });
        }

        // Settings form
        if (document.getElementById('settingsForm')) {
            document.getElementById('settingsForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }

        // Logout button
        if (document.getElementById('logoutBtn')) {
            document.getElementById('logoutBtn').addEventListener('click', () => {
                authManager.logout();
            });
        }
    }

    // Check if section is visible
    isSectionVisible(sectionName) {
        const section = document.getElementById(sectionName + 'Section');
        return section && !section.classList.contains('d-none');
    }

    // Show section
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('d-none');
        });

        // Remove active class from all links
        document.querySelectorAll('.admin-sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected section
        const section = document.getElementById(sectionName + 'Section');
        if (section) {
            section.classList.remove('d-none');
            
            // Set active link
            const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }

            // Load section data
            switch(sectionName) {
                case 'users':
                    this.displayUsers();
                    break;
                case 'tournaments':
                    this.displayTournaments();
                    break;
                case 'recharge':
                    this.displayRechargeRequests();
                    break;
                case 'withdraw':
                    this.displayWithdrawRequests();
                    break;
                case 'notices':
                    this.displayNotices();
                    break;
                case 'results':
                    this.displayResults();
                    break;
                case 'settings':
                    this.loadSettingsForm();
                    break;
                case 'dashboard':
                    this.displayDashboard();
                    break;
            }
        }
    }

    // Update statistics
    updateStats() {
        this.stats.totalUsers = this.users.length;
        this.stats.totalTournaments = this.tournaments.length;
        
        // Calculate total revenue
        this.stats.totalRevenue = this.tournaments.reduce((total, tournament) => {
            return total + ((tournament.entryFee || 0) * (tournament.joinedPlayers || 0));
        }, 0);
        
        // Count pending requests
        this.stats.pendingRequests = this.rechargeRequests.filter(r => r.status === 'pending').length +
                                     this.withdrawRequests.filter(w => w.status === 'pending').length;

        // Update UI
        this.updateStatsUI();
    }

    updateStatsUI() {
        document.getElementById('totalUsers').textContent = this.stats.totalUsers;
        document.getElementById('totalTournaments').textContent = this.stats.totalTournaments;
        document.getElementById('totalRevenue').textContent = '৳' + this.stats.totalRevenue;
        document.getElementById('pendingRequests').textContent = this.stats.pendingRequests;
    }

    // Display dashboard
    displayDashboard() {
        this.displayRecentTournaments();
        this.updateStatsUI();
    }

    // Display recent tournaments
    displayRecentTournaments() {
        const container = document.getElementById('recentTournaments');
        if (!container) return;
        
        const recent = this.tournaments.slice(-5).reverse();
        
        let html = '';
        recent.forEach(tournament => {
            html += `
                <tr>
                    <td>${tournament.title}</td>
                    <td><span class="badge-status badge-${tournament.status}">${tournament.status}</span></td>
                    <td>${tournament.joinedPlayers || 0}/${tournament.maxPlayers || 0}</td>
                    <td>${new Date(tournament.schedule).toLocaleDateString()}</td>
                </tr>
            `;
        });
        
        container.innerHTML = html || '<tr><td colspan="4" class="text-center">No tournaments found</td></tr>';
    }

    // Display users
    displayUsers() {
        const container = document.getElementById('usersTable');
        if (!container) return;
        
        const searchTerm = document.getElementById('searchUsers')?.value.toLowerCase() || '';
        const filteredUsers = this.users.filter(user => 
            user.name?.toLowerCase().includes(searchTerm) ||
            user.email?.toLowerCase().includes(searchTerm) ||
            user.ffid?.toLowerCase().includes(searchTerm)
        );

        let html = '';
        filteredUsers.forEach((user, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <strong>${user.name || 'N/A'}</strong><br>
                        <small>${user.email || 'N/A'}</small>
                    </td>
                    <td>${user.ffid || 'N/A'}</td>
                    <td class="text-success">৳${user.balance || 0}</td>
                    <td>
                        <span class="badge ${user.isActive ? 'bg-success' : 'bg-danger'}">
                            ${user.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="adminManager.editUser('${user.uid}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminManager.deleteUser('${user.uid}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html || '<tr><td colspan="6" class="text-center">No users found</td></tr>';
    }

    // Create tournament
    async createTournament() {
        const form = document.getElementById('createTournamentForm');
        const formData = new FormData(form);
        
        const tournamentData = {
            title: formData.get('title'),
            type: formData.get('type'),
            entryFee: parseInt(formData.get('entryFee')),
            prize: parseInt(formData.get('prize')),
            killReward: parseInt(formData.get('killReward')),
            maxPlayers: parseInt(formData.get('maxPlayers')),
            schedule: formData.get('schedule'),
            status: 'upcoming',
            joinedPlayers: 0,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdBy: authManager.currentUser.uid
        };

        try {
            await database.ref('tournaments').push(tournamentData);
            
            // Reset form
            form.reset();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createTournamentModal'));
            modal.hide();
            
            showToast('success', 'Tournament created successfully!');
        } catch (error) {
            showToast('error', error.message);
        }
    }

    // Delete tournament
    async deleteTournament(tournamentId) {
        if (!confirm('Are you sure you want to delete this tournament?')) return;
        
        try {
            await database.ref('tournaments/' + tournamentId).remove();
            showToast('success', 'Tournament deleted successfully!');
        } catch (error) {
            showToast('error', error.message);
        }
    }

    // Approve recharge request
    async approveRecharge(requestId) {
        const request = this.rechargeRequests.find(r => r.id === requestId);
        if (!request) return;
        
        try {
            // Update request status
            await database.ref('rechargeRequests/' + requestId).update({
                status: 'approved',
                approvedAt: firebase.database.ServerValue.TIMESTAMP,
                approvedBy: authManager.currentUser.uid
            });
            
            // Update user balance
            const userRef = database.ref('users/' + request.userId);
            const snapshot = await userRef.once('value');
            const user = snapshot.val();
            
            const newBalance = (user.balance || 0) + request.amount;
            await userRef.update({ balance: newBalance });
            
            // Add transaction record
            await database.ref('users/' + request.userId + '/transactions').push({
                type: 'recharge',
                amount: request.amount,
                method: request.method,
                status: 'approved',
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            showToast('success', 'Recharge approved and balance added!');
        } catch (error) {
            showToast('error', error.message);
        }
    }

    // Reject recharge request
    async rejectRecharge(requestId) {
        try {
            await database.ref('rechargeRequests/' + requestId).update({
                status: 'rejected',
                rejectedAt: firebase.database.ServerValue.TIMESTAMP,
                rejectedBy: authManager.currentUser.uid
            });
            showToast('success', 'Recharge request rejected!');
        } catch (error) {
            showToast('error', error.message);
        }
    }

    // Auto update tournament status
    autoUpdateTournamentStatus() {
        const now = Date.now();
        
        this.tournaments.forEach(tournament => {
            if (tournament.status === 'upcoming') {
                const startTime = new Date(tournament.schedule).getTime();
                const tenMinutesBefore = 10 * 60 * 1000;
                
                if (now >= (startTime - tenMinutesBefore) && now < startTime) {
                    this.updateTournamentStatus(tournament.id, 'live');
                }
            }
            
            if (tournament.status === 'live') {
                const liveTime = tournament.liveAt || new Date(tournament.schedule).getTime();
                const twoHours = 2 * 60 * 60 * 1000;
                
                if (now >= (liveTime + twoHours)) {
                    this.updateTournamentStatus(tournament.id, 'completed');
                }
            }
        });
    }

    // Update tournament status
    async updateTournamentStatus(tournamentId, status) {
        const updates = {
            status: status,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        if (status === 'live') {
            updates.roomId = this.generateRoomId();
            updates.password = this.generatePassword();
            updates.liveAt = firebase.database.ServerValue.TIMESTAMP;
        }
        
        if (status === 'completed') {
            updates.completedAt = firebase.database.ServerValue.TIMESTAMP;
            // Calculate winners
            await this.calculateTournamentResults(tournamentId);
        }
        
        try {
            await database.ref('tournaments/' + tournamentId).update(updates);
            console.log(`Tournament ${tournamentId} updated to ${status}`);
        } catch (error) {
            console.error('Error updating tournament:', error);
        }
    }

    // Generate room ID
    generateRoomId() {
        return Math.floor(100000000 + Math.random() * 900000000).toString();
    }

    // Generate password
    generatePassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let password = '';
        for (let i = 0; i < 6; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    // Edit user
    editUser(userId) {
        const user = this.users.find(u => u.uid === userId);
        if (user) {
            const newBalance = prompt(`Enter new balance for ${user.name}:`, user.balance);
            if (newBalance !== null && !isNaN(newBalance)) {
                database.ref('users/' + userId).update({
                    balance: parseInt(newBalance)
                })
                .then(() => {
                    showToast('success', 'User balance updated!');
                })
                .catch(error => {
                    showToast('error', error.message);
                });
            }
        }
    }

    // Delete user
    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        
        try {
            await database.ref('users/' + userId).remove();
            showToast('success', 'User deleted successfully!');
        } catch (error) {
            showToast('error', error.message);
        }
    }

    // Load and display tournaments
    displayTournaments() {
        const container = document.getElementById('tournamentsTable');
        if (!container) return;
        
        let html = '';
        this.tournaments.forEach(tournament => {
            html += `
                <tr>
                    <td>${tournament.title}</td>
                    <td><span class="badge bg-info">${tournament.type}</span></td>
                    <td>${new Date(tournament.schedule).toLocaleString()}</td>
                    <td><span class="badge-status badge-${tournament.status}">${tournament.status}</span></td>
                    <td>${tournament.joinedPlayers || 0}/${tournament.maxPlayers || 0}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            ${tournament.status === 'upcoming' ? `
                                <button class="btn btn-success" onclick="adminManager.updateTournamentStatus('${tournament.id}', 'live')">
                                    <i class="fas fa-play"></i>
                                </button>
                            ` : ''}
                            
                            ${tournament.status === 'live' ? `
                                <button class="btn btn-warning" onclick="adminManager.updateTournamentStatus('${tournament.id}', 'completed')">
                                    <i class="fas fa-flag-checkered"></i>
                                </button>
                                <button class="btn btn-info" onclick="adminManager.editTournamentRoom('${tournament.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                            ` : ''}
                            
                            <button class="btn btn-danger" onclick="adminManager.deleteTournament('${tournament.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html || '<tr><td colspan="6" class="text-center">No tournaments found</td></tr>';
    }

    // Load data functions
    async loadUsers() {
        const snapshot = await database.ref('users').once('value');
        if (snapshot.exists()) {
            this.users = [];
            snapshot.forEach((child) => {
                const user = child.val();
                user.uid = child.key;
                this.users.push(user);
            });
        }
    }

    async loadTournaments() {
        const snapshot = await database.ref('tournaments').once('value');
        if (snapshot.exists()) {
            this.tournaments = [];
            snapshot.forEach((child) => {
                const tournament = child.val();
                tournament.id = child.key;
                this.tournaments.push(tournament);
            });
        }
    }

    async loadRechargeRequests() {
        const snapshot = await database.ref('rechargeRequests').once('value');
        if (snapshot.exists()) {
            this.rechargeRequests = [];
            snapshot.forEach((child) => {
                const request = child.val();
                request.id = child.key;
                this.rechargeRequests.push(request);
            });
        }
    }

    async loadWithdrawRequests() {
        const snapshot = await database.ref('withdrawRequests').once('value');
        if (snapshot.exists()) {
            this.withdrawRequests = [];
            snapshot.forEach((child) => {
                const request = child.val();
                request.id = child.key;
                this.withdrawRequests.push(request);
            });
        }
    }

    async loadNotices() {
        const snapshot = await database.ref('notices').once('value');
        if (snapshot.exists()) {
            this.notices = [];
            snapshot.forEach((child) => {
                const notice = child.val();
                notice.id = child.key;
                this.notices.push(notice);
            });
        }
    }

    async loadSettings() {
        const snapshot = await database.ref('settings').once('value');
        return snapshot.exists() ? snapshot.val() : {};
    }

    // Display recharge requests
    displayRechargeRequests() {
        const container = document.getElementById('rechargeRequestsTable');
        if (!container) return;
        
        let html = '';
        this.rechargeRequests.forEach(request => {
            html += `
                <tr>
                    <td>${request.username}</td>
                    <td>৳${request.amount}</td>
                    <td><span class="badge bg-primary">${request.method}</span></td>
                    <td>${new Date(request.timestamp).toLocaleString()}</td>
                    <td><span class="badge-status badge-${request.status}">${request.status}</span></td>
                    <td>
                        ${request.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" onclick="adminManager.approveRecharge('${request.id}')">
                                Approve
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminManager.rejectRecharge('${request.id}')">
                                Reject
                            </button>
                        ` : 'Completed'}
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html || '<tr><td colspan="6" class="text-center">No recharge requests</td></tr>';
    }

    // Display withdraw requests
    displayWithdrawRequests() {
        const container = document.getElementById('withdrawRequestsTable');
        if (!container) return;
        
        let html = '';
        this.withdrawRequests.forEach(request => {
            html += `
                <tr>
                    <td>${request.username}</td>
                    <td>৳${request.amount}</td>
                    <td><span class="badge bg-primary">${request.method}</span></td>
                    <td>${new Date(request.timestamp).toLocaleString()}</td>
                    <td><span class="badge-status badge-${request.status}">${request.status}</span></td>
                    <td>
                        ${request.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" onclick="adminManager.approveWithdraw('${request.id}')">
                                Pay
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminManager.rejectWithdraw('${request.id}')">
                                Reject
                            </button>
                        ` : 'Completed'}
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html || '<tr><td colspan="6" class="text-center">No withdraw requests</td></tr>';
    }

    // Approve withdraw request
    async approveWithdraw(requestId) {
        const request = this.withdrawRequests.find(r => r.id === requestId);
        if (!request) return;
        
        try {
            await database.ref('withdrawRequests/' + requestId).update({
                status: 'approved',
                approvedAt: firebase.database.ServerValue.TIMESTAMP,
                approvedBy: authManager.currentUser.uid
            });
            
            // Update user balance
            const userRef = database.ref('users/' + request.userId);
            const snapshot = await userRef.once('value');
            const user = snapshot.val();
            
            const newBalance = (user.balance || 0) - request.amount;
            await userRef.update({ balance: newBalance });
            
            // Add transaction record
            await database.ref('users/' + request.userId + '/transactions').push({
                type: 'withdrawal',
                amount: -request.amount,
                method: request.method,
                status: 'approved',
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            showToast('success', 'Withdrawal approved and processed!');
        } catch (error) {
            showToast('error', error.message);
        }
    }

    // Reject withdraw request
    async rejectWithdraw(requestId) {
        try {
            await database.ref('withdrawRequests/' + requestId).update({
                status: 'rejected',
                rejectedAt: firebase.database.ServerValue.TIMESTAMP,
                rejectedBy: authManager.currentUser.uid
            });
            showToast('success', 'Withdrawal request rejected!');
        } catch (error) {
            showToast('error', error.message);
        }
    }

    // Calculate tournament results
    async calculateTournamentResults(tournamentId) {
        try {
            const tournamentRef = database.ref('tournaments/' + tournamentId);
            const playersRef = database.ref('tournaments/' + tournamentId + '/players');
            
            const [tournamentSnap, playersSnap] = await Promise.all([
                tournamentRef.once('value'),
                playersRef.once('value')
            ]);
            
            const tournament = tournamentSnap.val();
            const players = [];
            
            playersSnap.forEach((child) => {
                const player = child.val();
                player.username = child.key;
                players.push(player);
            });
            
            // Sort by kills
            players.sort((a, b) => (b.kills || 0) - (a.kills || 0));
            
            // Distribute prizes
            const results = {
                winners: [],
                totalPlayers: players.length,
                calculatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            if (players.length >= 1) {
                results.winners.push({
                    username: players[0].username,
                    position: 1,
                    prize: tournament.prize,
                    kills: players[0].kills || 0
                });
                
                // Add kill rewards
                const killReward = (players[0].kills || 0) * tournament.killReward;
                await this.addUserBalance(players[0].username, tournament.prize + killReward);
            }
            
            if (players.length >= 2) {
                const secondPrize = tournament.prize * 0.5;
                results.winners.push({
                    username: players[1].username,
                    position: 2,
                    prize: secondPrize,
                    kills: players[1].kills || 0
                });
                
                const killReward = (players[1].kills || 0) * tournament.killReward;
                await this.addUserBalance(players[1].username, secondPrize + killReward);
            }
            
            if (players.length >= 3) {
                const thirdPrize = tournament.prize * 0.25;
                results.winners.push({
                    username: players[2].username,
                    position: 3,
                    prize: thirdPrize,
                    kills: players[2].kills || 0
                });
                
                const killReward = (players[2].kills || 0) * tournament.killReward;
                await this.addUserBalance(players[2].username, thirdPrize + killReward);
            }
            
            // Save results
            await database.ref('tournaments/' + tournamentId + '/results').set(results);
            
        } catch (error) {
            console.error('Error calculating results:', error);
        }
    }

    // Add user balance
    async addUserBalance(username, amount) {
        try {
            // Find user by username
            const usersRef = database.ref('users');
            const snapshot = await usersRef.orderByChild('email').equalTo(username).once('value');
            
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    const userRef = database.ref('users/' + child.key);
                    userRef.transaction((user) => {
                        if (user) {
                            user.balance = (user.balance || 0) + amount;
                        }
                        return user;
                    });
                });
            }
        } catch (error) {
            console.error('Error adding user balance:', error);
        }
    }
}

// Initialize Admin Manager when page loads
let adminManager;

document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.admin-dashboard')) {
        adminManager = new AdminManager();
    }
});
