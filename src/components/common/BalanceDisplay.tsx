import React from 'react';
import styles from '../../styles/GamePage.module.css';

interface BalanceItem {
  id: string;
  name: string;
  balance: number;
  isInfinite?: boolean;
  isCurrentPlayer?: boolean;
}

interface BalanceDisplayProps {
  title: string;
  items: BalanceItem[];
  actionButton?: React.ReactNode;
  itemRenderer?: (item: BalanceItem) => React.ReactNode;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({ 
  title, 
  items, 
  actionButton,
  itemRenderer
}) => {
  return (
    <section className={styles['section']}>
      <h2>
        {title}
        {actionButton}
      </h2>
      <div className={styles['balance-list']}>
        {items.length > 0 ? (
          items.map(item => (
            itemRenderer ? (
              <React.Fragment key={item.id}>
                {itemRenderer(item)}
              </React.Fragment>
            ) : (
              <div key={item.id} className={styles['balance-item']}>
                <div className={styles['balance-name']}>{item.name}</div>
                <div className={styles['balance-amount']}>
                  {item.isInfinite ? '∞' : item.balance}
                </div>
              </div>
            )
          ))
        ) : (
          <p>No {title.toLowerCase()} available.</p>
        )}
      </div>
    </section>
  );
};

export default BalanceDisplay; 