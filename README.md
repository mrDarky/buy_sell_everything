# Buy & Sell Everything - Full Stack Marketplace

A comprehensive full-stack marketplace application with admin panel for buying and selling items, featuring live auctions, real-time messaging, secure transactions, and cryptocurrency payments (TON, USDT).

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy
- **Database**: SQLite
- **Frontend**: Bootstrap 5, JavaScript
- **Real-time**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **Payments**: Cryptocurrency support (TON, USDT)

## Features

### Site Features
- **Homepage**: Modern landing page with statistics and featured items
- **User Authentication**: Secure registration and login with JWT
- **Listings**: Create, view, edit, and purchase listings
- **Seller Tools**: Create and manage listings with categories
- **Auctions**: Live auction bidding with real-time updates
- **Messaging**: Real-time messaging between users
- **Reviews & Ratings**: Rate and review sellers/buyers (1-5 stars)
- **Transactions**: Secure transaction management with escrow

### Admin Panel Features
- **Dashboard**: Real-time metrics and alerts
  - Total users, active listings, active auctions
  - Total revenue, pending disputes, flagged content
- **User Management**: CRUD operations, activate/deactivate users
- **Listing Management**: View, flag, and moderate all listings
- **Auction Management**: Monitor auctions and view bid history
- **Dispute Resolution**: Handle transaction disputes with chat logs
- **Payment Management**: Track TON and USDT payments and payouts
- **Content Moderation**: Flag management and AI spam detection (placeholder)

### Real-time Features (Socket.IO)
- Live auction bidding updates
- Real-time messaging notifications
- Instant dashboard metric updates

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mrDarky/buy_sell_everything.git
   cd buy_sell_everything
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the application**
   ```bash
   python main.py
   ```

6. **Access the application**
   - Main Site: http://localhost:8000
   - Admin Panel: http://localhost:8000/admin
   - API Documentation: http://localhost:8000/docs

## Default Admin Credentials

- **Email**: admin@example.com
- **Password**: admin123

⚠️ **Important**: Change these credentials in production by modifying the `.env` file.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Listings
- `GET /api/listings` - Get all listings
- `GET /api/listings/{id}` - Get specific listing
- `POST /api/listings` - Create listing (authenticated)
- `PUT /api/listings/{id}` - Update listing (authenticated)
- `DELETE /api/listings/{id}` - Delete listing (authenticated)

### Auctions
- `GET /api/auctions` - Get all auctions
- `GET /api/auctions/{id}` - Get specific auction
- `POST /api/auctions` - Create auction (authenticated)
- `POST /api/auctions/{id}/bid` - Place bid (authenticated)
- `GET /api/auctions/{id}/bids` - Get auction bids

### Messages
- `GET /api/messages` - Get user messages (authenticated)
- `POST /api/messages` - Send message (authenticated)
- `PUT /api/messages/{id}/read` - Mark as read (authenticated)

### Reviews
- `GET /api/reviews/user/{id}` - Get user reviews
- `POST /api/reviews` - Create review (authenticated)

### Transactions
- `GET /api/transactions` - Get user transactions (authenticated)
- `POST /api/transactions` - Create transaction (authenticated)
- `PUT /api/transactions/{id}/complete` - Complete transaction (authenticated)

### Disputes
- `POST /api/disputes` - Create dispute (authenticated)

### Payments
- `GET /api/payments` - Get user payments (authenticated)
- `POST /api/payments` - Create payment (authenticated)

### Admin Endpoints (Admin only)
- `GET /api/admin/dashboard` - Get dashboard metrics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/{id}/toggle-active` - Toggle user status
- `GET /api/admin/listings` - Get all listings
- `PUT /api/admin/listings/{id}/flag` - Flag listing
- `GET /api/admin/disputes` - Get all disputes
- `PUT /api/admin/disputes/{id}/resolve` - Resolve dispute
- `GET /api/admin/payments` - Get all payments

## Database Schema

### Models
- **User**: Users with roles (admin, seller, buyer)
- **Listing**: Product listings with categories
- **Auction**: Auction items with bidding
- **Bid**: Auction bids
- **Message**: User-to-user messages
- **Review**: User reviews and ratings
- **Transaction**: Purchase transactions with escrow
- **Dispute**: Transaction dispute management
- **Payment**: Cryptocurrency payment records

## Project Structure

```
buy_sell_everything/
├── main.py                 # FastAPI application and routes
├── database.py            # Database configuration
├── models.py              # SQLAlchemy models
├── schemas.py             # Pydantic schemas
├── auth.py                # Authentication utilities
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore file
├── README.md             # This file
├── static/
│   ├── css/
│   │   ├── style.css     # Main site styles
│   │   └── admin.css     # Admin panel styles
│   └── js/
│       ├── app.js        # Main site JavaScript
│       └── admin.js      # Admin panel JavaScript
└── templates/
    ├── index.html        # Main site homepage
    └── admin.html        # Admin panel interface
```

## Future Enhancements

- AI-powered spam detection implementation
- Full cryptocurrency wallet integration (TON, USDT)
- Advanced search and filtering
- Image upload functionality
- Email notifications
- SMS verification
- Multi-language support
- Mobile app (React Native)
- Advanced analytics dashboard
- Automated auction closing
- Bulk operations for admin
- Export/Import functionality
- API rate limiting
- Enhanced security features

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Support

For support, please open an issue on GitHub or contact the maintainers.