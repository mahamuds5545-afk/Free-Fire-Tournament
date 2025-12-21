// User functions
console.log("User JS loaded!");

let userBalance = 0;

function joinTournament(fee) {
    if(userBalance >= fee) {
        alert("Joined tournament!");
    } else {
        alert("Insufficient balance!");
    }
}

function addBalance(amount) {
    userBalance += amount;
    alert("Balance added: ৳" + amount);
}