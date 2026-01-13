import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from './lib/supabase';
import { setUser } from './store/authSlice';
import BlogList from './pages/BlogList';
import CreateBlog from './pages/CreateBlog';
import EditBlog from './pages/EditBlog';
import Login from './pages/Login';
import Register from './pages/Register';
import BlogDetail from './pages/BlogDetail';
import Logout from './pages/Logout';


// Import components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        dispatch(setUser(session.user));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          dispatch(setUser(session.user));
        }
        if (event === 'SIGNED_OUT') {
          dispatch(setUser(null));
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<BlogList />} />
        <Route path="/blog/:id" element={<BlogDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/logout" element={<Logout />} />
        
        {/* Protected Routes */}
        <Route path="/create" element={
          <ProtectedRoute>
            <CreateBlog />
          </ProtectedRoute>
        } />
        
        <Route path="/edit/:id" element={
          <ProtectedRoute>
            <EditBlog />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;