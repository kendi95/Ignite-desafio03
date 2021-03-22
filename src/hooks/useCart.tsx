import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // TODO
      const response = await api.get<Product>(`/products/${productId}`);

      const resStock = await api.get<Stock>(`/stock/${productId}`);

      let { id, amount } = resStock.data;

      

      if (amount > 0) {
        const storage = localStorage.getItem('@RocketShoes:cart');
        if (!storage) {
          const data = {
            ...response.data,
            amount: 1
          }
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, data]));
          setCart([...cart, data]);
          await api.patch(`/stock/${id}`, { amount: amount-- });
          return;
        }

        if (amount === 0) {
          throw new Error('OUT_STOCK');
        }

        const storageCart = JSON.parse(storage) as Product[];

        const findedIndex = storageCart.findIndex(findCart => findCart.id === id);
        let newCart = storageCart;
        newCart[findedIndex].amount += 1;
        setCart([...newCart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...newCart]));

        await api.patch(`/stock/${id}`, { amount: amount-- });
      }
      
    } catch(err) {
      // TODO
      const { response, message } = err;

      if (message && message === 'OUT_STOCK') {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (response) {
        if (response.status === 404) {
          toast.error('Erro na adição do produto');
          return;
        }
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // TODO
      const findedCart = cart.find(findCart => findCart.id === productId);

      if (!findedCart) {
        throw new Error('Erro na remoção do produto');
      }

      const newCart = cart.filter(findCart => findCart.id !== productId);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart([...newCart]);
    } catch(err) {
      // TODO
      toast.error(err.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      // TODO
      const response: Stock = await api.get(`/stock/${productId}`).then(response => response.data).catch(() => {
        throw new Error('Erro na alteração de quantidade do produto')
      });

      if (amount <= 0) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      if (response.amount < amount) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      setCart(oldCarts => {
        const findedIndex = oldCarts.findIndex(findCart => findCart.id === productId);

        if (!oldCarts[findedIndex]) {
          throw new Error('Erro na alteração de quantidade do produto');
        }

        oldCarts[findedIndex].amount = amount;
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...oldCarts]));
        return [...oldCarts];
      });

    } catch(err) {
      toast.error(err.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
