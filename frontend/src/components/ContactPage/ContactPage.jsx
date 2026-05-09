// src/pages/ContactPage.jsx
import React, { useState } from 'react';
import { MessageCircle, Send, Phone, MapPin, Mail, Ticket, Popcorn, CircleCheck, ExternalLink } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BeamsBackground } from '../ui/beams-background';

/* ─── shared input / label styles ─── */
const inputCls =
  'flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/40 transition';

const selectCls =
  'flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/40 transition appearance-none cursor-pointer';

const labelCls = 'block text-sm font-medium text-gray-300 mb-1.5';

const highlights = [
  { id: 1, feature: 'Fast response within 24 hours' },
  { id: 2, feature: 'Dedicated cinema support team' },
  { id: 3, feature: 'WhatsApp instant messaging support' },
];

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Only allow digits for phone and limit to 10 chars
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, phone: digits }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate phone is exactly 10 digits
    if (!formData.phone || formData.phone.length !== 10) {
      toast.error('⚠️ Please enter a valid 10-digit phone number.');
      console.warn('Submit blocked - invalid phone:', formData.phone);
      return;
    }

    // Format the message for WhatsApp
    const whatsappMessage = `Name: ${encodeURIComponent(formData.name)}%0AEmail: ${encodeURIComponent(formData.email)}%0APhone: ${encodeURIComponent(formData.phone)}%0ASubject: ${encodeURIComponent(formData.subject)}%0AMessage: ${encodeURIComponent(formData.message)}`;

    // Open WhatsApp with pre-filled message
    window.open(`https://wa.me/9123707332?text=${whatsappMessage}`, '_blank');
  };

  return (
    <BeamsBackground intensity="medium" className="min-h-screen">
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 text-white">
        <ToastContainer
          position="top-right"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />

        <div className="mx-auto max-w-6xl">

          {/* ── Page heading ── */}
          <div className="mb-10">
            <h1 className="text-3xl font-semibold text-white">
              <span className="text-red-400">Contact</span>{' '}
              <span className="text-white">Us</span>
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Have questions about movie bookings or special events? Our team is here to help you!
            </p>
          </div>

          {/* ── 12-column grid ── */}
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">

            {/* ── LEFT: Form (7 cols) ── */}
            <div className="lg:col-span-7">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Name + Email row */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className={labelCls}>
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className={inputCls}
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className={labelCls}>
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={inputCls}
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className={labelCls}>
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    title="Enter a 10-digit phone number"
                    className={inputCls}
                    placeholder="Your phone number"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    10-digit mobile number, digits only
                  </p>
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className={labelCls}>
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className={selectCls}
                  >
                    <option value="" className="bg-gray-900">Select a subject</option>
                    <option value="Ticket Booking" className="bg-gray-900">Ticket Booking</option>
                    <option value="Group Events" className="bg-gray-900">Group Events</option>
                    <option value="Membership" className="bg-gray-900">Membership Inquiry</option>
                    <option value="Technical Issue" className="bg-gray-900">Technical Issue</option>
                    <option value="Refund" className="bg-gray-900">Refund Request</option>
                    <option value="Other" className="bg-gray-900">Other</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className={labelCls}>
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="4"
                    className={`${inputCls} h-auto resize-none`}
                    placeholder="Please describe your inquiry in detail..."
                  />
                </div>

                {/* ── Separator ── */}
                <div className="h-px w-full bg-white/10 my-2" />

                {/* ── Actions ── */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ name: '', email: '', phone: '', subject: '', message: '' })}
                    className="h-10 px-4 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-white/8 transition border border-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-md text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition shadow-sm"
                  >
                    Send via WhatsApp
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* ── RIGHT: Info card (5 cols) ── */}
            <div className="lg:col-span-5 space-y-5">

              {/* Contact info card */}
              <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Ticket className="h-4 w-4 text-red-400" />
                  <span className="text-xs font-bold tracking-widest text-red-400 uppercase">
                    Booking Support
                  </span>
                </div>
                <h2 className="text-base font-semibold text-white mb-2 mt-3">
                  Contact Information
                </h2>
                <p className="text-sm leading-6 text-gray-400 mb-5">
                  Our cinema support team is available during all show hours. Reach out via any of the channels below.
                </p>

                {/* Highlights */}
                <ul className="space-y-2 mb-5">
                  {highlights.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm text-gray-300">
                      <CircleCheck className="h-4 w-4 text-red-400 shrink-0" />
                      <span>{item.feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="h-px w-full bg-white/10 mb-5" />

                {/* Contact details */}
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md border border-white/10 bg-white/5 p-2">
                      <Phone className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Booking Hotline</p>
                      <p className="text-sm text-gray-400">+91 9123707332</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md border border-white/10 bg-white/5 p-2">
                      <Mail className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Email Address</p>
                      <p className="text-sm text-gray-400">shanildanshah@gmail.com</p>
                      <p className="text-sm text-gray-400">danishshanil@gmail.com</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md border border-white/10 bg-white/5 p-2">
                      <MapPin className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Main Theater Location</p>
                      <p className="text-sm text-gray-400">7/1 Govind Dhar Lane, Central Avenue, Kolkata 700001</p>
                      <p className="text-xs text-red-400 mt-0.5">+4 other locations across the city</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Emergency card */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 backdrop-blur-sm p-5">
                <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4" />
                  Urgent Show-Related Issues
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  For urgent issues during a movie screening (sound, projection, etc.)
                </p>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-amber-600 px-3 py-1 text-xs font-bold text-white">
                    HOTLINE: +91 9123707332
                  </span>
                  <span className="text-xs text-amber-400">Available during showtimes</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </BeamsBackground>
  );
};

export default ContactPage;