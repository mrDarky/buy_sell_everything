from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
import socketio
import os

from database import get_db, init_db
from models import (
    User, Listing, Auction, Bid, Message, Review, Transaction, Dispute, Payment,
    Category, ActivityLog,
    UserRole, ListingStatus, ListingType, AuctionStatus, TransactionStatus, DisputeStatus
)
from schemas import (
    UserCreate, UserLogin, User as UserSchema, Token,
    ListingCreate, ListingUpdate, Listing as ListingSchema,
    AuctionCreate, Auction as AuctionSchema,
    BidCreate, Bid as BidSchema,
    MessageCreate, Message as MessageSchema,
    ReviewCreate, Review as ReviewSchema,
    TransactionCreate, Transaction as TransactionSchema,
    DisputeCreate, Dispute as DisputeSchema,
    PaymentCreate, Payment as PaymentSchema,
    CategoryCreate, CategoryUpdate, Category as CategorySchema,
    ActivityLogCreate, ActivityLog as ActivityLogSchema,
    DashboardMetrics
)
from auth import verify_password, get_password_hash, create_access_token, decode_access_token

# Initialize FastAPI
app = FastAPI(title="Buy & Sell Everything", version="1.0.0")

# Initialize Socket.IO
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

# Security
security = HTTPBearer()

# Initialize database
@app.on_event("startup")
async def startup_event():
    init_db()
    # Create default admin user
    db = next(get_db())
    admin = db.query(User).filter(User.email == os.getenv("ADMIN_EMAIL", "admin@example.com")).first()
    if not admin:
        admin = User(
            email=os.getenv("ADMIN_EMAIL", "admin@example.com"),
            username="admin",
            hashed_password=get_password_hash(os.getenv("ADMIN_PASSWORD", "admin123")),
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True
        )
        db.add(admin)
        db.commit()
    db.close()

# Dependency to get current user
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Dependency to check admin role
async def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Helper function to log activities
def log_activity(db: Session, user_id: int, action: str, description: str = None, ip_address: str = None):
    """Log user activity"""
    activity = ActivityLog(
        user_id=user_id,
        action=action,
        description=description,
        ip_address=ip_address
    )
    db.add(activity)
    db.commit()

# ==================== AUTH ROUTES ====================

@app.post("/api/auth/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(
        (User.email == user.email) | (User.username == user.username)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create new user
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=get_password_hash(user.password),
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(db_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not db_user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")
    
    # Update last login timestamp
    db_user.last_login = datetime.utcnow()
    db.commit()
    
    access_token = create_access_token(data={"sub": str(db_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserSchema)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==================== LISTING ROUTES ====================

@app.get("/api/listings", response_model=List[ListingSchema])
def get_listings(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    status: Optional[ListingStatus] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Listing)
    if category:
        query = query.filter(Listing.category == category)
    if status:
        query = query.filter(Listing.status == status)
    else:
        query = query.filter(Listing.status == ListingStatus.ACTIVE)
    
    return query.offset(skip).limit(limit).all()

@app.get("/api/listings/{listing_id}", response_model=ListingSchema)
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Increment views
    listing.views += 1
    db.commit()
    
    return listing

@app.post("/api/listings", response_model=ListingSchema)
def create_listing(
    listing: ListingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_listing = Listing(**listing.dict(), seller_id=current_user.id)
    db.add(db_listing)
    db.commit()
    db.refresh(db_listing)
    
    # Log activity
    log_activity(db, current_user.id, "Posted Listing", f"Created listing: {listing.title}")
    
    return db_listing

@app.put("/api/listings/{listing_id}", response_model=ListingSchema)
def update_listing(
    listing_id: int,
    listing_update: ListingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not db_listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if db_listing.seller_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for key, value in listing_update.dict(exclude_unset=True).items():
        setattr(db_listing, key, value)
    
    db.commit()
    db.refresh(db_listing)
    return db_listing

@app.delete("/api/listings/{listing_id}")
def delete_listing(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not db_listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if db_listing.seller_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(db_listing)
    db.commit()
    return {"detail": "Listing deleted"}

# ==================== AUCTION ROUTES ====================

@app.get("/api/auctions", response_model=List[AuctionSchema])
def get_auctions(
    skip: int = 0,
    limit: int = 100,
    status: Optional[AuctionStatus] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Auction)
    if status:
        query = query.filter(Auction.status == status)
    else:
        query = query.filter(Auction.status == AuctionStatus.ACTIVE)
    
    return query.offset(skip).limit(limit).all()

@app.get("/api/auctions/{auction_id}", response_model=AuctionSchema)
def get_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auction

@app.post("/api/auctions", response_model=AuctionSchema)
def create_auction(
    auction: AuctionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_auction = Auction(
        **auction.dict(),
        seller_id=current_user.id,
        current_price=auction.starting_price
    )
    db.add(db_auction)
    db.commit()
    db.refresh(db_auction)
    return db_auction

@app.post("/api/auctions/{auction_id}/bid", response_model=BidSchema)
async def place_bid(
    auction_id: int,
    bid: BidCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction.status != AuctionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Auction is not active")
    
    if auction.end_time < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Auction has ended")
    
    if bid.amount <= auction.current_price:
        raise HTTPException(status_code=400, detail="Bid must be higher than current price")
    
    # Create bid
    db_bid = Bid(
        auction_id=auction_id,
        bidder_id=current_user.id,
        amount=bid.amount
    )
    db.add(db_bid)
    
    # Update auction current price
    auction.current_price = bid.amount
    db.commit()
    db.refresh(db_bid)
    
    # Log activity
    log_activity(db, current_user.id, "Bid Placed", f"Placed bid of ${bid.amount} on auction #{auction_id}")
    
    # Emit real-time update via Socket.IO
    await sio.emit('new_bid', {
        'auction_id': auction_id,
        'amount': bid.amount,
        'bidder': current_user.username
    })
    
    return db_bid

@app.get("/api/auctions/{auction_id}/bids", response_model=List[BidSchema])
def get_auction_bids(auction_id: int, db: Session = Depends(get_db)):
    bids = db.query(Bid).filter(Bid.auction_id == auction_id).order_by(Bid.created_at.desc()).all()
    return bids

# ==================== MESSAGE ROUTES ====================

@app.get("/api/messages", response_model=List[MessageSchema])
def get_messages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(Message).filter(
        (Message.sender_id == current_user.id) | (Message.receiver_id == current_user.id)
    ).order_by(Message.created_at.desc()).all()
    return messages

@app.post("/api/messages", response_model=MessageSchema)
async def send_message(
    message: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_message = Message(
        sender_id=current_user.id,
        receiver_id=message.receiver_id,
        content=message.content
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    # Emit real-time message via Socket.IO
    await sio.emit('new_message', {
        'id': db_message.id,
        'sender_id': current_user.id,
        'receiver_id': message.receiver_id,
        'content': message.content,
        'created_at': db_message.created_at.isoformat()
    }, room=f"user_{message.receiver_id}")
    
    return db_message

@app.put("/api/messages/{message_id}/read")
def mark_message_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    message.is_read = True
    db.commit()
    return {"detail": "Message marked as read"}

# ==================== REVIEW ROUTES ====================

@app.get("/api/reviews/user/{user_id}", response_model=List[ReviewSchema])
def get_user_reviews(user_id: int, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.reviewee_id == user_id).all()
    return reviews

@app.post("/api/reviews", response_model=ReviewSchema)
def create_review(
    review: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    db_review = Review(**review.dict(), reviewer_id=current_user.id)
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

# ==================== TRANSACTION ROUTES ====================

@app.get("/api/transactions", response_model=List[TransactionSchema])
def get_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transactions = db.query(Transaction).filter(
        (Transaction.buyer_id == current_user.id) | (Transaction.seller_id == current_user.id)
    ).all()
    return transactions

@app.post("/api/transactions", response_model=TransactionSchema)
def create_transaction(
    transaction: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    listing = db.query(Listing).filter(Listing.id == transaction.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.status != ListingStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Listing is not available")
    
    db_transaction = Transaction(
        listing_id=transaction.listing_id,
        buyer_id=current_user.id,
        seller_id=listing.seller_id,
        amount=listing.price,
        payment_method=transaction.payment_method
    )
    db.add(db_transaction)
    
    # Update listing status
    listing.status = ListingStatus.SOLD
    
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.put("/api/transactions/{transaction_id}/complete")
def complete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.seller_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    transaction.status = TransactionStatus.COMPLETED
    transaction.escrow_held = False
    transaction.completed_at = datetime.utcnow()
    db.commit()
    
    return {"detail": "Transaction completed"}

# ==================== DISPUTE ROUTES ====================

@app.post("/api/disputes", response_model=DisputeSchema)
def create_dispute(
    dispute: DisputeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transaction = db.query(Transaction).filter(Transaction.id == dispute.transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.buyer_id != current_user.id and transaction.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_dispute = Dispute(**dispute.dict(), reported_by=current_user.id)
    db.add(db_dispute)
    
    transaction.status = TransactionStatus.DISPUTED
    
    db.commit()
    db.refresh(db_dispute)
    return db_dispute

# ==================== PAYMENT ROUTES ====================

@app.post("/api/payments", response_model=PaymentSchema)
def create_payment(
    payment: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_payment = Payment(**payment.dict(), user_id=current_user.id)
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

@app.get("/api/payments", response_model=List[PaymentSchema])
def get_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    payments = db.query(Payment).filter(Payment.user_id == current_user.id).all()
    return payments

# ==================== ADMIN ROUTES ====================

@app.get("/api/admin/dashboard", response_model=DashboardMetrics)
def get_dashboard_metrics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    total_users = db.query(func.count(User.id)).scalar()
    active_listings = db.query(func.count(Listing.id)).filter(Listing.status == ListingStatus.ACTIVE).scalar()
    active_auctions = db.query(func.count(Auction.id)).filter(Auction.status == AuctionStatus.ACTIVE).scalar()
    total_transactions = db.query(func.count(Transaction.id)).scalar()
    pending_disputes = db.query(func.count(Dispute.id)).filter(Dispute.status == DisputeStatus.OPEN).scalar()
    flagged_content = db.query(func.count(Listing.id)).filter(Listing.is_flagged == True).scalar()
    total_revenue = db.query(func.sum(Transaction.amount)).filter(Transaction.status == TransactionStatus.COMPLETED).scalar() or 0.0
    
    return DashboardMetrics(
        total_users=total_users,
        active_listings=active_listings,
        active_auctions=active_auctions,
        total_transactions=total_transactions,
        pending_disputes=pending_disputes,
        flagged_content=flagged_content,
        total_revenue=total_revenue
    )

@app.get("/api/admin/users", response_model=List[UserSchema])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@app.put("/api/admin/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = not user.is_active
    db.commit()
    return {"detail": f"User {'activated' if user.is_active else 'deactivated'}"}

@app.get("/api/admin/listings", response_model=List[ListingSchema])
def get_all_listings(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    listings = db.query(Listing).offset(skip).limit(limit).all()
    return listings

@app.put("/api/admin/listings/{listing_id}/flag")
def flag_listing(
    listing_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    listing.is_flagged = True
    listing.status = ListingStatus.FLAGGED
    db.commit()
    return {"detail": "Listing flagged"}

@app.get("/api/admin/disputes", response_model=List[DisputeSchema])
def get_all_disputes(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    disputes = db.query(Dispute).offset(skip).limit(limit).all()
    return disputes

@app.put("/api/admin/disputes/{dispute_id}/resolve")
def resolve_dispute(
    dispute_id: int,
    resolution: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    dispute.status = DisputeStatus.RESOLVED
    dispute.resolution = resolution
    dispute.resolved_by = current_user.id
    dispute.resolved_at = datetime.utcnow()
    
    db.commit()
    return {"detail": "Dispute resolved"}

@app.get("/api/admin/payments", response_model=List[PaymentSchema])
def get_all_payments(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    payments = db.query(Payment).offset(skip).limit(limit).all()
    return payments

# ==================== ADMIN USER MANAGEMENT ROUTES ====================

@app.get("/api/admin/users/{user_id}", response_model=UserSchema)
def get_user_details(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/api/admin/users/{user_id}", response_model=UserSchema)
def update_user(
    user_id: int,
    email: Optional[str] = None,
    username: Optional[str] = None,
    role: Optional[UserRole] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if email:
        user.email = email
    if username:
        user.username = username
    if role:
        user.role = role
    
    db.commit()
    db.refresh(user)
    return user

@app.delete("/api/admin/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Cannot delete admin users")
    
    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}

# ==================== ADMIN LISTING MANAGEMENT ROUTES ====================

@app.put("/api/admin/listings/{listing_id}/feature")
def toggle_feature_listing(
    listing_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    listing.is_featured = not listing.is_featured
    db.commit()
    return {"detail": f"Listing {'featured' if listing.is_featured else 'unfeatured'}"}

# ==================== ADMIN AUCTION MANAGEMENT ROUTES ====================

@app.put("/api/admin/auctions/{auction_id}/extend")
def extend_auction(
    auction_id: int,
    hours: int = Query(..., ge=1, le=168),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    auction.end_time = auction.end_time + timedelta(hours=hours)
    db.commit()
    return {"detail": f"Auction extended by {hours} hours", "new_end_time": auction.end_time}

@app.put("/api/admin/auctions/{auction_id}/cancel")
def cancel_auction(
    auction_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    auction.status = AuctionStatus.CANCELLED
    db.commit()
    return {"detail": "Auction cancelled"}

# ==================== CATEGORY MANAGEMENT ROUTES ====================

@app.get("/api/categories", response_model=List[CategorySchema])
def get_categories(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(Category)
    if active_only:
        query = query.filter(Category.is_active == True)
    return query.order_by(Category.order).offset(skip).limit(limit).all()

@app.get("/api/categories/{category_id}", response_model=CategorySchema)
def get_category(category_id: int, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@app.post("/api/admin/categories", response_model=CategorySchema)
def create_category(
    category: CategoryCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Check if category name already exists
    existing = db.query(Category).filter(Category.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    db_category = Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@app.put("/api/admin/categories/{category_id}", response_model=CategorySchema)
def update_category(
    category_id: int,
    category_update: CategoryUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for key, value in category_update.dict(exclude_unset=True).items():
        setattr(db_category, key, value)
    
    db.commit()
    db.refresh(db_category)
    return db_category

@app.delete("/api/admin/categories/{category_id}")
def delete_category(
    category_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if category has subcategories
    subcategories = db.query(Category).filter(Category.parent_id == category_id).first()
    if subcategories:
        raise HTTPException(status_code=400, detail="Cannot delete category with subcategories")
    
    db.delete(category)
    db.commit()
    return {"detail": "Category deleted"}

# ==================== ACTIVITY LOG ROUTES ====================

@app.get("/api/admin/activities", response_model=List[ActivityLogSchema])
def get_activity_logs(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    suspicious_only: bool = False,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(ActivityLog)
    
    if user_id:
        query = query.filter(ActivityLog.user_id == user_id)
    if action:
        query = query.filter(ActivityLog.action.contains(action))
    if suspicious_only:
        query = query.filter(ActivityLog.is_suspicious == True)
    
    return query.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()

@app.get("/api/admin/activities/{activity_id}", response_model=ActivityLogSchema)
def get_activity_log_details(
    activity_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    activity = db.query(ActivityLog).filter(ActivityLog.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity log not found")
    return activity

@app.put("/api/admin/activities/{activity_id}/flag")
def flag_activity(
    activity_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    activity = db.query(ActivityLog).filter(ActivityLog.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity log not found")
    
    activity.is_suspicious = True
    db.commit()
    return {"detail": "Activity flagged as suspicious"}

# ==================== SOCKET.IO EVENTS ====================

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    room = data.get('room')
    await sio.enter_room(sid, room)
    print(f"Client {sid} joined room {room}")

# ==================== STATIC FILES & TEMPLATES ====================

# Mount static files
os.makedirs("static", exist_ok=True)
os.makedirs("templates", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_root():
    return FileResponse("templates/index.html")

@app.get("/admin", response_class=HTMLResponse)
async def admin_panel():
    return FileResponse("templates/admin.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)
