import { Link, useLocation } from 'react-router-dom'
import { Calendar, Plus, User, Bookmark, Bell } from 'lucide-react'
import Button from '../ui/button'
import Badge from '../ui/badge'
import { useApp } from '../../contexts/useApp'

export function Navbar() {
  const location = useLocation()
  const { display_name, savedEvents, userRole } = useApp()

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Calendar className="w-8 h-8 text-pink-600" />
            <span className="text-xl font-bold text-gray-900">UniEvents</span>
          </Link>

          <div className="flex items-center space-x-1">
            <Link to="/">
              <Button variant={isActive('/') ? 'default' : 'ghost'} className="text-sm">
                <Calendar className="w-4 h-4 mr-2" />
                Events
              </Button>
            </Link>

            <Link to="/saved">
              <Button
                variant={isActive('/saved') ? 'default' : 'ghost'}
                className="text-sm relative"
              >
                <Bookmark className="w-4 h-4 mr-2" />
                Saved
                {savedEvents.length > 0 && (
                  <Badge className="ml-2 px-1.5 py-0 h-5 text-xs">{savedEvents.length}</Badge>
                )}
              </Button>
            </Link>

            <Link to="/my-events">
              <Button variant={isActive('/my-events') ? 'default' : 'ghost'} className="text-sm">
                <Bell className="w-4 h-4 mr-2" />
                My Events
              </Button>
            </Link>

            {userRole === 'ORGANIZER' && (
              <Link to="/create">
                <Button variant={isActive('/create') ? 'default' : 'ghost'} className="text-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </Button>
              </Link>
            )}

            <Link to="/profile">
              <Button variant={isActive('/profile') ? 'default' : 'ghost'} className="text-sm">
                <User className="w-4 h-4 mr-2" />
                {display_name.split(' ')[0]}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
