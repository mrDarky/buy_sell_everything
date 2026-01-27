from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SELLER = "seller"
    BUYER = "buyer"

class ListingStatus(str, enum.Enum):
    ACTIVE = "active"
    SOLD = "sold"
    INACTIVE = "inactive"
    FLAGGED = "flagged"

class ListingType(str, enum.Enum):
    ONE_TIME = "one-time"
    RECURRING = "recurring"

class AuctionStatus(str, enum.Enum):
    ACTIVE = "active"
    ENDED = "ended"
    CANCELLED = "cancelled"

class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"

class DisputeStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.BUYER)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    listings = relationship("Listing", back_populates="seller", foreign_keys="Listing.seller_id")
    auctions = relationship("Auction", back_populates="seller")
    bids = relationship("Bid", back_populates="bidder")
    reviews_given = relationship("Review", back_populates="reviewer", foreign_keys="Review.reviewer_id")
    reviews_received = relationship("Review", back_populates="reviewee", foreign_keys="Review.reviewee_id")
    transactions_as_buyer = relationship("Transaction", back_populates="buyer", foreign_keys="Transaction.buyer_id")
    transactions_as_seller = relationship("Transaction", back_populates="seller", foreign_keys="Transaction.seller_id")
    messages_sent = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    messages_received = relationship("Message", back_populates="receiver", foreign_keys="Message.receiver_id")

class Listing(Base):
    __tablename__ = "listings"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    image_url = Column(String)
    status = Column(Enum(ListingStatus), default=ListingStatus.ACTIVE)
    listing_type = Column(Enum(ListingType), default=ListingType.ONE_TIME)
    is_featured = Column(Boolean, default=False)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    views = Column(Integer, default=0)
    is_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    seller = relationship("User", back_populates="listings", foreign_keys=[seller_id])
    transactions = relationship("Transaction", back_populates="listing")

class Auction(Base):
    __tablename__ = "auctions"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    starting_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    reserve_price = Column(Float)
    category = Column(String, nullable=False)
    image_url = Column(String)
    status = Column(Enum(AuctionStatus), default=AuctionStatus.ACTIVE)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    end_time = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    seller = relationship("User", back_populates="auctions")
    bids = relationship("Bid", back_populates="auction")

class Bid(Base):
    __tablename__ = "bids"
    
    id = Column(Integer, primary_key=True, index=True)
    auction_id = Column(Integer, ForeignKey("auctions.id"), nullable=False)
    bidder_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    auction = relationship("Auction", back_populates="bids")
    bidder = relationship("User", back_populates="bids")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sender = relationship("User", back_populates="messages_sent", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="messages_received", foreign_keys=[receiver_id])

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text)
    transaction_id = Column(Integer, ForeignKey("transactions.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    reviewer = relationship("User", back_populates="reviews_given", foreign_keys=[reviewer_id])
    reviewee = relationship("User", back_populates="reviews_received", foreign_keys=[reviewee_id])
    transaction = relationship("Transaction", back_populates="reviews")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String)  # TON, USDT, etc.
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    escrow_held = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    listing = relationship("Listing", back_populates="transactions")
    buyer = relationship("User", back_populates="transactions_as_buyer", foreign_keys=[buyer_id])
    seller = relationship("User", back_populates="transactions_as_seller", foreign_keys=[seller_id])
    reviews = relationship("Review", back_populates="transaction")
    dispute = relationship("Dispute", back_populates="transaction", uselist=False)

class Dispute(Base):
    __tablename__ = "disputes"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    reported_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Enum(DisputeStatus), default=DisputeStatus.OPEN)
    resolution = Column(Text)
    resolved_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)
    
    # Relationships
    transaction = relationship("Transaction", back_populates="dispute")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False)  # TON, USDT
    wallet_address = Column(String)
    transaction_hash = Column(String)
    status = Column(String, default="pending")
    payment_type = Column(String)  # deposit, withdrawal, payout
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    parent_id = Column(Integer, ForeignKey("categories.id"))
    is_active = Column(Boolean, default=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parent = relationship("Category", remote_side=[id], backref="subcategories")

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # e.g., "Posted Listing", "Bid Placed"
    description = Column(Text)
    ip_address = Column(String)
    is_suspicious = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
