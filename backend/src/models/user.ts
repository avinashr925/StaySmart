import mongoose, { Schema, Document } from "mongoose";

export interface ILoginHistoryItem {
  ip: string;
  device: string;
  browser: string;
  os: string;
  loginAt: Date;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  username: string;
  name: string;
  email: string;
  password?: string;
  passwordHash?: string;
  role: "Guest" | "Host" | "PropertyManager" | "Admin" | "SuperAdmin";
  avatar?: string;
  profilePhoto?: string;
  googleId?: string;
  refreshTokens: string[];
  
  // Profile information
  phoneNumber?: string;
  phone?: string;
  bio?: string;
  languages?: string[];
  work?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  dob?: Date;

  // Authentication & Verification
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  isSuspended: boolean;
  isActive: boolean;

  // Login Tracking
  lastLogin?: Date;
  loginHistory: ILoginHistoryItem[];

  // Host properties
  isHostApproved: boolean;
  hostApprovedAt?: Date;
  taxId?: string;
  payoutDetails?: string;
  isSuperhost: boolean;
  paymentProfile?: {
    provider: string;
    linkedAccountId?: string;
    status: "NOT_STARTED" | "PENDING" | "VERIFICATION_PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  };
  bankDetails?: {
    accountHolderName?: string;
    accountNumberEncrypted?: string;
    accountNumberMasked?: string;
    ifscEncrypted?: string;
    accountNumberIv?: string;
    ifscIv?: string;
    bankName?: string;
    upiId?: string;
    upiQrCodeUrl?: string;
  };
  gstDetails?: {
    isRegistered: boolean;
    gstin?: string;
    legalBusinessName?: string;
    registeredAddress?: string;
  };
  isOnboarded: boolean;
  defaultHouseRules?: {
    smokingAllowed: boolean;
    petsAllowed: boolean;
    partiesAllowed: boolean;
    childrenAllowed: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    checkInFrom?: string;
    checkInUntil?: string;
    checkOutBy?: string;
    customRules?: string[];
  };


  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, "Please enter a valid email"],
    },
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ["Guest", "Host", "PropertyManager", "Admin", "SuperAdmin"],
      default: "Guest",
    },
    avatar: {
      type: String,
    },
    profilePhoto: {
      type: String,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    refreshTokens: {
      type: [String],
      default: [],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    languages: {
      type: [String],
      default: [],
    },
    work: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    dob: {
      type: Date,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    isSuspended: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    loginHistory: {
      type: [
        {
          ip: String,
          device: String,
          browser: String,
          os: String,
          loginAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    isHostApproved: {
      type: Boolean,
      default: false,
    },
    hostApprovedAt: Date,
    taxId: {
      type: String,
      trim: true,
    },
    payoutDetails: {
      type: String,
      trim: true,
    },
    isSuperhost: {
      type: Boolean,
      default: false,
    },
    paymentProfile: {
      provider: { type: String, default: "razorpay" },
      linkedAccountId: String,
      status: {
        type: String,
        enum: ["NOT_STARTED", "PENDING", "VERIFICATION_PENDING", "ACTIVE", "REJECTED", "SUSPENDED"],
        default: "NOT_STARTED",
      },
    },
    bankDetails: {
      accountHolderName: String,
      accountNumberEncrypted: { type: String, select: false },
      accountNumberMasked: String,
      ifscEncrypted: { type: String, select: false },
      accountNumberIv: { type: String, select: false },
      ifscIv: { type: String, select: false },
      bankName: String,
      upiId: String,
      upiQrCodeUrl: String,
    },
    gstDetails: {
      isRegistered: { type: Boolean, default: false },
      gstin: String,
      legalBusinessName: String,
      registeredAddress: String,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    defaultHouseRules: {
      smokingAllowed: { type: Boolean, default: false },
      petsAllowed: { type: Boolean, default: false },
      partiesAllowed: { type: Boolean, default: false },
      childrenAllowed: { type: Boolean, default: true },
      quietHoursStart: { type: String, default: "" },
      quietHoursEnd: { type: String, default: "" },
      checkInFrom: { type: String, default: "14:00" },
      checkInUntil: { type: String, default: "22:00" },
      checkOutBy: { type: String, default: "11:00" },
      customRules: { type: [String], default: [] }
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for passwordHash mapping
userSchema.virtual("passwordHash")
  .get(function(this: IUser) {
    return this.password;
  })
  .set(function(this: IUser, val: string) {
    this.password = val;
  });

// Pre-validate hook for backwards compatibility & consistency
userSchema.pre("validate", function (next) {
  // Concat or split names
  if (this.name && (!this.firstName || !this.lastName)) {
    const parts = this.name.trim().split(/\s+/);
    this.firstName = parts[0] || "User";
    this.lastName = parts.slice(1).join(" ") || "Smart";
  } else if (this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`.trim();
  }

  // Generate unique username if missing
  if (!this.username) {
    if (this.email) {
      this.username = this.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") + Math.floor(Math.random() * 1000);
    } else if (this.name) {
      this.username = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, "") + Math.floor(Math.random() * 1000);
    } else {
      this.username = "user" + Math.floor(Math.random() * 1000000);
    }
  }

  // Sync profile photo and avatar
  if (this.isModified("avatar") && !this.isModified("profilePhoto")) {
    this.profilePhoto = this.avatar;
  } else if (this.isModified("profilePhoto") && !this.isModified("avatar")) {
    this.avatar = this.profilePhoto;
  } else if (this.profilePhoto && !this.avatar) {
    this.avatar = this.profilePhoto;
  } else if (this.avatar && !this.profilePhoto) {
    this.profilePhoto = this.avatar;
  }

  // Sync phone and phoneNumber
  if (this.phone && !this.phoneNumber) {
    this.phoneNumber = this.phone;
  } else if (this.phoneNumber && !this.phone) {
    this.phone = this.phoneNumber;
  }

  next();
});

// Indexes for faster lookups
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ isHostApproved: 1 });
userSchema.index({ passwordResetToken: 1 });

export default mongoose.model<IUser>("User", userSchema);
