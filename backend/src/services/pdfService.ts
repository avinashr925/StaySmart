import PDFDocument from "pdfkit";
import { Writable } from "stream";

export function generateInvoicePdf(stream: Writable, booking: any, payment: any) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  doc.pipe(stream);

  // Logo / Header
  doc.fillColor("#e11d48").fontSize(26).font("Helvetica-Bold").text("StaySmart", 50, 50);
  doc.fillColor("#6b7280").fontSize(10).font("Helvetica").text("AI-Enhanced Vacation Rental Platform", 50, 80);

  doc.fillColor("#09090b").fontSize(16).font("Helvetica-Bold").text("BOOKING CONFIRMATION & INVOICE", 50, 120);

  // Divider
  doc.moveTo(50, 145).lineTo(545, 145).strokeColor("#e4e4e7").lineWidth(1).stroke();

  // Left Column: Stay Info
  doc.fillColor("#09090b").fontSize(11).font("Helvetica-Bold").text("Stay Details", 50, 165);
  doc.fontSize(9).font("Helvetica");
  doc.text(`Booking ID: STAY-2026-${booking._id.toString().substring(18, 24).toUpperCase()}`, 50, 185);
  doc.text(`Property: ${booking.listing.title}`, 50, 200);
  doc.text(`City: ${booking.listing.city || ""}`, 50, 215);
  doc.text(`Check-In Date: ${new Date(booking.startDate).toDateString()}`, 50, 230);
  doc.text(`Check-Out Date: ${new Date(booking.endDate).toDateString()}`, 50, 245);

  // Dynamic Payment Method & Provider resolution
  const method = (booking.paymentMethod || payment?.paymentMethod || "razorpay").toLowerCase();
  let paymentMethodStr = "";
  let paymentProviderStr = "";

  if (method === "upi") {
    paymentMethodStr = "UPI";
    paymentProviderStr = "Direct UPI";
  } else if (method === "mock") {
    paymentMethodStr = "Mock Payment";
    paymentProviderStr = "Mock Gateway";
  } else {
    paymentMethodStr = method.toUpperCase();
    paymentProviderStr = method === "razorpay" ? "Razorpay" : method.toUpperCase();
  }

  // Right Column: Guest Info
  doc.fillColor("#09090b").fontSize(11).font("Helvetica-Bold").text("Guest & Payment Info", 320, 165);
  doc.fontSize(9).font("Helvetica");
  doc.text(`Guest Name: ${booking.user.firstName || ""} ${booking.user.lastName || ""}`, 320, 185);
  doc.text(`Email Address: ${booking.user.email}`, 320, 200);
  doc.text(`Transaction Reference: ${payment?.paymentId || booking.upiTxnId || "N/A"}`, 320, 215);
  doc.text(`Payment Method: ${paymentMethodStr}`, 320, 230);
  doc.text(`Payment Provider: ${paymentProviderStr}`, 320, 245);
  doc.text(`Booking Status: ${booking.status.toUpperCase()}`, 320, 260);

  // Divider
  doc.moveTo(50, 275).lineTo(545, 275).strokeColor("#e4e4e7").stroke();

  // Pricing Table
  doc.fillColor("#09090b").fontSize(11).font("Helvetica-Bold").text("Charges Breakdown", 50, 295);

  // Table Headers
  doc.fontSize(9).font("Helvetica-Bold").text("Description", 50, 320);
  doc.text("Amount", 450, 320, { align: "right", width: 95 });

  doc.moveTo(50, 335).lineTo(545, 335).strokeColor("#f4f4f5").stroke();

  // Pricing snapshot utilization
  const snapshot = booking.pricingSnapshot;
  const nights = snapshot?.nights || Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (24 * 60 * 60 * 1000));
  const nightlyPrice = snapshot?.nightlyPrice || booking.listing.price;
  const basePrice = snapshot?.accommodationAmount || (nights * nightlyPrice);
  const cleaningFee = snapshot?.cleaningFee !== undefined ? snapshot.cleaningFee : (payment?.cleaningFee || 1000);
  const taxes = snapshot?.gstAmount !== undefined ? snapshot.gstAmount : (payment?.taxes || Math.round(basePrice * 0.08));
  const discount = snapshot?.discount || 0;

  // Table Rows
  doc.font("Helvetica").text(`Stay base price (${nights} nights x ₹${nightlyPrice.toLocaleString()})`, 50, 345);
  doc.text(`₹${basePrice.toLocaleString()}`, 450, 345, { align: "right", width: 95 });

  doc.text("Cleaning Fee", 50, 365);
  doc.text(`₹${cleaningFee.toLocaleString()}`, 450, 365, { align: "right", width: 95 });

  doc.text("Occupancy Taxes & GST", 50, 385);
  doc.text(`₹${taxes.toLocaleString()}`, 450, 385, { align: "right", width: 95 });

  if (discount > 0) {
    doc.fillColor("#10b981").text(`Promo Discount Coupon (${booking.couponApplied || payment?.couponApplied || "Applied"})`, 50, 405);
    doc.text(`-₹${discount.toLocaleString()}`, 450, 405, { align: "right", width: 95 });
  }

  doc.moveTo(50, 425).lineTo(545, 425).strokeColor("#e4e4e7").stroke();

  // Grand Total
  doc.fillColor("#09090b").fontSize(13).font("Helvetica-Bold").text("Grand Total Paid", 50, 440);
  doc.text(`₹${booking.totalPrice.toLocaleString()}`, 450, 440, { align: "right", width: 95 });

  // Footer / Terms
  doc.moveTo(50, 720).lineTo(545, 720).strokeColor("#e4e4e7").stroke();
  doc.fillColor("#9ca3af").fontSize(8).font("Helvetica").text("This is a computer-generated confirmation invoice. Keep a copy for check-in identification.", 50, 740, { align: "center", width: 495 });
  doc.text("Thank you for staying smart! For assistance, please email support@staysmart.com", 50, 752, { align: "center", width: 495 });

  doc.end();
}
