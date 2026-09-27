import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching products:', err);
        setLoading(false);
      });
  }, []);

  const addToCart = (product) => {
    setCart([...cart, product]);
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <h1>ShopNest</h1>
        <div className="cart-badge">
          🛒 Cart ({cart.length})
        </div>
      </header>

      <main className="content">
        <h2>Featured Products</h2>
        {loading ? (
          <p>Loading products...</p>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <div key={p.id} className="product-card">
                <h3>{p.name}</h3>
                <p className="price">${p.price}</p>
                <p>{p.description}</p>
                <button onClick={() => addToCart(p)}>Add to Cart</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
