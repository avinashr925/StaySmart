import { Request, Response, NextFunction } from "express";
import Message from "../models/message";
import User from "../models/user";
import Listing from "../models/listing";
import Booking from "../models/booking";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getSocketIO } from "../server";
import { getUploadedUrls } from "../utils/fileUpload";

export const sendMessage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { receiverId, message, listingId } = req.body;
  const senderId = req.user?._id;

  if (!receiverId || !message || !listingId) {
    return next(new AppError("Receiver ID, message content, and listing ID are required", 400));
  }

  // 1) Verify receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    return next(new AppError("Recipient user not found", 404));
  }

  // 2) Verify listing exists
  const listing = await Listing.findById(listingId);
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  const isSenderHost = listing.owner.toString() === senderId.toString();
  const isReceiverHost = listing.owner.toString() === receiverId.toString();

  if (!isSenderHost && !isReceiverHost) {
    return next(new AppError("You can only message about listings that you own or are inquiring about.", 403));
  }

  if (isSenderHost) {
    // Host replying to Guest. Make sure Guest has initiated contact or has a booking.
    const hasPriorContact = await Message.exists({
      sender: receiverId,
      receiver: senderId,
      listing: listingId,
    });
    
    const hasBooking = await Booking.exists({
      user: receiverId,
      listing: listingId,
    });

    if (!hasPriorContact && !hasBooking) {
      return next(new AppError("You do not have permission to message this guest yet.", 403));
    }
  }

  // 3) Create message
  const newMessage = await Message.create({
    sender: senderId,
    receiver: receiverId,
    listing: listingId,
    message: message.trim(),
    attachments: req.body.attachments || [],
    isRead: false,
  });

  const populatedMessage = await Message.findById(newMessage._id)
    .populate({ path: "sender", select: "name email avatar" })
    .populate({ path: "receiver", select: "name email avatar" });

  // 4) Push real-time notification via Socket.IO
  const io = getSocketIO();
  if (io) {
    io.to(`user-${receiverId}`).emit("newMessage", populatedMessage);
  }

  res.status(201).json({
    status: "success",
    data: { message: populatedMessage },
  });
});

export const getMessages = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { otherUserId } = req.params;
  const { listingId } = req.query;
  const userId = req.user?._id;

  if (listingId) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return next(new AppError("Listing not found", 404));
    }
    const isUserOwner = listing.owner.toString() === userId.toString();
    const isOtherUserOwner = listing.owner.toString() === otherUserId.toString();
    if (!isUserOwner && !isOtherUserOwner) {
      return next(new AppError("You are not authorized to view messages for this listing.", 403));
    }
  }

  const query: any = {
    $or: [
      { sender: userId, receiver: otherUserId },
      { sender: otherUserId, receiver: userId },
    ],
  };

  if (listingId) {
    query.listing = listingId;
  }

  const messages = await Message.find(query)
    .populate({ path: "sender", select: "name email avatar" })
    .populate({ path: "receiver", select: "name email avatar" })
    .sort({ createdAt: 1 }); // Chronological order

  res.status(200).json({
    status: "success",
    results: messages.length,
    data: { messages },
  });
});

export const getConversations = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;

  // Retrieve messages where user is sender or receiver
  const messages = await Message.find({
    $or: [{ sender: userId }, { receiver: userId }],
  }).sort({ createdAt: -1 });

  // Map messages into conversation groups: key is otherUser_listing
  const groupsMap = new Map<string, any>();

  for (const msg of messages) {
    const sId = msg.sender.toString();
    const rId = msg.receiver.toString();
    const otherUserId = sId === userId.toString() ? rId : sId;
    const listingId = msg.listing ? msg.listing.toString() : "none";
    const key = `${otherUserId}_${listingId}`;

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        otherUserId,
        listingId: listingId !== "none" ? listingId : null,
        lastMessage: msg.message,
        lastMessageTime: msg.createdAt,
        isUnread: !msg.isRead && msg.receiver.toString() === userId.toString(),
      });
    }
  }

  const groups = Array.from(groupsMap.values());

  // Fetch all unique other users and listings in parallel
  const otherUserIds = Array.from(new Set(groups.map((g) => g.otherUserId)));
  const listingIds = Array.from(new Set(groups.map((g) => g.listingId).filter(Boolean))) as string[];

  const [users, listings] = await Promise.all([
    User.find({ _id: { $in: otherUserIds } }).select("name email avatar role"),
    Listing.find({ _id: { $in: listingIds } }).select("title images price city country"),
  ]);

  const conversations = groups.map((g) => {
    const u = users.find((user) => user._id.toString() === g.otherUserId);
    const l = listings.find((list) => list._id.toString() === g.listingId);
    return {
      user: u || { _id: g.otherUserId, name: "Deleted User", email: "", avatar: "", role: "Guest" },
      listing: l || null,
      lastMessage: g.lastMessage,
      lastMessageTime: g.lastMessageTime,
      isUnread: g.isUnread,
    };
  });

  // Sort conversations by last message timestamp
  conversations.sort((a, b) => {
    const tA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const tB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return tB - tA;
  });

  res.status(200).json({
    status: "success",
    results: conversations.length,
    data: { conversations },
  });
});

export const markAsRead = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { otherUserId } = req.params;
  const userId = req.user?._id;

  await Message.updateMany(
    { sender: otherUserId, receiver: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  const io = getSocketIO();
  if (io) {
    io.to(`user-${otherUserId}`).emit("messagesRead", { readerId: userId });
  }

  res.status(200).json({
    status: "success",
    message: "Messages marked as read successfully",
  });
});

export const uploadAttachment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next(new AppError("No file uploaded", 400));
  }
  const urls = getUploadedUrls([req.file]);
  res.status(200).json({
    status: "success",
    data: {
      url: urls[0],
      fileName: req.file.originalname,
    },
  });
});
