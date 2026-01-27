from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from models import UserRole, ListingStatus, ListingType, AuctionStatus, TransactionStatus, DisputeStatus, CommentStatus

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
    last_login: Optional[datetime] = None
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
    listing_type: Optional[ListingType] = ListingType.ONE_TIME

class ListingCreate(ListingBase):
    pass

class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[ListingStatus] = None
    listing_type: Optional[ListingType] = None
    is_featured: Optional[bool] = None

class Listing(ListingBase):
    id: int
    seller_id: int
    status: ListingStatus
    listing_type: ListingType
    is_featured: bool
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

# Category Schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = True
    order: Optional[int] = 0

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None

class Category(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Activity Log Schemas
class ActivityLogBase(BaseModel):
    action: str
    description: Optional[str] = None
    ip_address: Optional[str] = None

class ActivityLogCreate(ActivityLogBase):
    user_id: int

class ActivityLog(ActivityLogBase):
    id: int
    user_id: int
    is_suspicious: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Comment Schemas
class CommentBase(BaseModel):
    listing_id: int
    content: str

class CommentCreate(CommentBase):
    pass

class CommentUpdate(BaseModel):
    content: Optional[str] = None
    status: Optional[CommentStatus] = None

class Comment(CommentBase):
    id: int
    user_id: int
    status: CommentStatus
    created_at: datetime
    
    class Config:
        from_attributes = True

# Promotion Schemas
class PromotionBase(BaseModel):
    listing_id: int
    discount_percentage: float
    start_date: datetime
    end_date: datetime

class PromotionCreate(PromotionBase):
    pass

class PromotionUpdate(BaseModel):
    discount_percentage: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None

class Promotion(PromotionBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Shipping Method Schemas
class ShippingMethodBase(BaseModel):
    name: str
    description: Optional[str] = None
    base_cost: float
    estimated_days: Optional[int] = None

class ShippingMethodCreate(ShippingMethodBase):
    pass

class ShippingMethodUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_cost: Optional[float] = None
    estimated_days: Optional[int] = None
    is_active: Optional[bool] = None

class ShippingMethod(ShippingMethodBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Site Settings Schemas
class SiteSettingBase(BaseModel):
    setting_key: str
    setting_value: Optional[str] = None
    setting_type: Optional[str] = "string"
    description: Optional[str] = None

class SiteSettingCreate(SiteSettingBase):
    pass

class SiteSettingUpdate(BaseModel):
    setting_value: Optional[str] = None
    description: Optional[str] = None

class SiteSetting(SiteSettingBase):
    id: int
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogBase(BaseModel):
    action: str
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    admin_id: int

class AuditLog(AuditLogBase):
    id: int
    admin_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Support Ticket Schemas
class SupportTicketBase(BaseModel):
    subject: str
    message: str

class SupportTicketCreate(SupportTicketBase):
    pass

class SupportTicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[int] = None

class SupportTicket(SupportTicketBase):
    id: int
    user_id: int
    status: str
    priority: str
    assigned_to: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
