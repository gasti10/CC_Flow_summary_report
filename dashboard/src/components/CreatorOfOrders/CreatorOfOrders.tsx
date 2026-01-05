// Componente placeholder para Creator of Orders
// Esta ruta está protegida y requiere autenticación
import { useAuth } from '../../hooks/useAuth'
import './CreatorOfOrders.css'

const CreatorOfOrders = () => {
  const { user, signOut } = useAuth()

  return (
    <div className="creator-of-orders">
      <div className="creator-header">
        <h1>Creator of Orders</h1>
        <div className="user-info">
          <span>Bienvenido, {user?.email}</span>
          <button onClick={() => signOut()} className="logout-button">
            Cerrar Sesión
          </button>
        </div>
      </div>
      <div className="creator-content">
        <p>Esta es una ruta protegida. Aquí puedes implementar la funcionalidad de Creator of Orders.</p>
      </div>
    </div>
  )
}

export default CreatorOfOrders
