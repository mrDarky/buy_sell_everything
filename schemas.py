from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from models import UserRole, ListingStatus, AuctionStatus, TransactionStatus, DisputeStatus

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    role: UserRole = UserRole.BUYER

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Listing Schemas
class ListingBase(BaseModel):
    title: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None

class ListingCreate(ListingBase):
    pass

class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[ListingStatus] = None

class Listing(ListingBase):
    id: int
    seller_id: int
    status: ListingStatus
    views: int
    is_flagged: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Auction Schemas
class AuctionBase(BaseModel):
    title: str
    description: str
    starting_price: float
    reserve_price: Optional[float] = None
    category: str
    image_url: Optional[str] = None
    end_time: datetime

class AuctionCreate(AuctionBase):
    pass

class Auction(AuctionBase):
    id: int
    seller_id: int
    current_price: float
    status: AuctionStatus
    created_at: datetime
    
    class Config:
        from_attributes = True

# Bid Schema
class BidCreate(BaseModel):
    amount: float

class Bid(BaseModel):
    id: int
    auction_id: int
    bidder_id: int
    amount: float
    created_at: datetime
    
    class Config:
        from_attributes = True

# Message Schemas
class MessageCreate(BaseModel):
    receiver_id: int
    content: str

class Message(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Review Schemas
class ReviewCreate(BaseModel):
    reviewee_id: int
    rating: int
    comment: Optional[str] = None
    transaction_id: Optional[int] = None

class Review(BaseModel):
    id: int
    reviewer_id: int
    reviewee_id: int
    rating: int
    comment: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Transaction Schemas
class TransactionCreate(BaseModel):
    listing_id: int
    payment_method: str

class Transaction(BaseModel):
    id: int
    listing_id: int
    buyer_id: int
    seller_id: int
    amount: float
    payment_method: str
    status: TransactionStatus
    escrow_held: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Dispute Schemas
class DisputeCreate(BaseModel):
    transaction_id: int
    reason: str

class Dispute(BaseModel):
    id: int
    transaction_id: int
    reported_by: int
    reason: str
    status: DisputeStatus
    created_at: datetime
    
    class Config:
        from_attributes = True

# Payment Schemas
class PaymentCreate(BaseModel):
    amount: float
    currency: str
    wallet_address: Optional[str] = None
    payment_type: str

class Payment(BaseModel):
    id: int
    user_id: int
    amount: float
    currency: str
    status: str
    payment_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Admin Dashboard Metrics
class DashboardMetrics(BaseModel):
    total_users: int
    active_listings: int
    active_auctions: int
    total_transactions: int
    pending_disputes: int
    flagged_content: int
    total_revenue: float
