import React from 'react';
import styles from '../styles/GamePage.module.css';

interface Transaction {
  id: string;
  timestamp: number;
  senderId: string;
  receiverId: string;
  amount: number;
  isDeleted: boolean;
}

interface EntityMap {
  [key: string]: {
    name: string;
    [key: string]: any;
  };
}

interface TransactionsListProps {
  transactions: Transaction[];
  players: EntityMap;
  stashes: EntityMap;
  onNewTransaction?: () => void;
  disabled?: boolean;
}

const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  players,
  stashes,
  onNewTransaction,
  disabled = false
}) => {
  // Filter and sort transactions
  const sortedTransactions = [...transactions]
    .filter(tx => !tx.isDeleted)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  return (
    <section className={styles['section']}>
      <h2>
        Recent Transactions
        {onNewTransaction && (
          <button 
            className={styles['new-transaction-button']}
            onClick={onNewTransaction}
            disabled={disabled}
          >
            New Transaction
          </button>
        )}
      </h2>
      <div className={styles['transactions-list']}>
        {sortedTransactions.length > 0 ? (
          <table className={styles['transactions-table']}>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map(transaction => {
                const sender = 
                  players[transaction.senderId] || 
                  stashes[transaction.senderId] || 
                  { name: 'Unknown' };
                
                const receiver = 
                  players[transaction.receiverId] || 
                  stashes[transaction.receiverId] || 
                  { name: 'Unknown' };
                
                return (
                  <tr key={transaction.id}>
                    <td>{sender.name}</td>
                    <td>{receiver.name}</td>
                    <td>{transaction.amount}</td>
                    <td>{new Date(transaction.timestamp).toLocaleTimeString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No transactions yet.</p>
        )}
      </div>
    </section>
  );
};

export default TransactionsList; 