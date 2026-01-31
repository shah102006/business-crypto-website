export interface User {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Trade {
    id: string;
    userId: string;
    cryptocurrency: string;
    amount: number;
    price: number;
    tradeDate: Date;
}

export interface Transaction {
    id: string;
    userId: string;
    tradeId: string;
    transactionDate: Date;
    status: 'pending' | 'completed' | 'failed';
}