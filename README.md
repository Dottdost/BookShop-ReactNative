# Cheshire Shelf Mobile

Cheshire Shelf Mobile is a cross-platform mobile bookstore application built with Expo, React Native, and TypeScript. The app provides a complete bookstore experience for customers while also offering an integrated admin panel for managing the store from a mobile interface.

The project focuses on real-world mobile application development: authentication, API integration, role-based access, order flow, real-time support chat, and admin management tools.

---

## Overview

Cheshire Shelf Mobile allows users to browse books, view detailed book information, manage their cart and wishlist, place orders, and contact support. Admin users can manage the bookstore directly inside the app, including books, users, orders, promo codes, publishers, genres, and support requests.

The application is connected to a backend API and is designed to work not only as a visual prototype, but as a functional mobile client for a bookstore system.

---

## Core Features

### Customer Experience

- Browse available books
- View detailed book pages
- Add books to cart
- Save books to wishlist
- Complete checkout with address and payment information
- View personal order history
- Contact support through an in-app chat

### Admin Panel

The application includes a role-protected admin area where authorized users can manage the main parts of the bookstore system:

- Book management
- Genre management
- Publisher management
- User management
- Order management
- Promo code management
- Support ticket management

This makes the project more than a customer-facing app: it also includes internal tools for store administration.

### Orders and Checkout

The checkout flow connects multiple parts of the system:

- Cart review
- Delivery address form
- Payment card form
- Promo code support
- Order creation
- Order status tracking

The order system supports different order states such as pending, paid, shipped, completed, and canceled.

### Real-Time Support Chat

The app includes a support chat system for communication between customers and admins.

The support module includes:

- Customer chat widget
- Admin support dashboard
- Waiting chat queue
- Assigned admin chats
- Message sending and receiving
- SignalR integration for real-time communication

This is one of the most advanced parts of the project because it combines authentication, real-time connection handling, backend communication, and role-based interfaces.

---

## Technical Highlights

### Role-Based Access

The application changes available functionality depending on the user role. Regular users, admins, and super admins have different access levels and different interface options.

### Secure Mobile Authentication

The app uses secure token storage for mobile authentication, making the login flow suitable for Expo and Android testing instead of relying only on browser storage.

### Backend API Integration

The application communicates with a real backend API for authentication, books, orders, users, promo codes, publishers, genres, and support chat.

### Real-Time Communication

SignalR is used for real-time chat functionality, allowing support messages to update without manually refreshing the app.

### Admin Functionality Inside Mobile App

The project includes a full admin panel directly inside the mobile application. This demonstrates not only UI development, but also complex permission-based management logic.

### Persistent App State

The app keeps important user data available across sessions, such as cart and saved books, creating a more realistic bookstore experience.

---

## Tech Stack

- Expo
- React Native
- TypeScript
- Expo Router
- SignalR
- AsyncStorage
- Expo SecureStore
- REST API
- i18n localization
- React Native animations

---

## Why This Project Stands Out

Cheshire Shelf Mobile is not just a book listing interface. It is a complete mobile bookstore system with customer features, admin tools, real-time communication, authentication, checkout, and order management.

The project demonstrates:

- Mobile-first UI development
- API-based architecture
- Authentication and protected routes
- Role-based functionality
- Real-time support chat
- E-commerce flow
- Admin dashboard logic
- Persistent mobile storage

This makes it suitable as an academic project, portfolio project, and foundation for a production-ready bookstore application.

---

## Getting Started

Install dependencies:

```bash
npm install
```

## Start the Expo development server:

```bash
npx expo start
```

## Start with cleared cache:

```bash
npx expo start -c
```

## Run on Android emulator:

```bash
npx expo start -c --localhost
```

## Then press:

```bash
a
```

### Project Purpose

The purpose of Cheshire Shelf Mobile is to demonstrate how a mobile application can combine a customer bookstore experience with a complete admin management system.

It brings together frontend development, backend integration, authentication, real-time communication, and mobile-specific storage into one practical application.

## Environment Configuration

The frontend uses an API base URL to communicate with the backend.

## Example environment variable:

VITE_API_URL=http://cheshireshelfapp-env.eba-pzcyg6yq.eu-north-1.elasticbeanstalk.com

The value can be changed depending on the backend environment.

## Production Deployment

The production version is deployed to AWS S3 using the configured CI/CD pipeline.

For local production build testing:

```bash
npm run build
```

The generated production files are placed inside the dist folder.

In the deployed workflow, GitHub Actions handles the build and upload process automatically.

### Project Purpose

The purpose of Cheshire Shelf Web is to demonstrate how a modern React application can work as a complete frontend for an online bookstore system.

It brings together customer-facing e-commerce features, admin management tools, backend API integration, authentication, real-time communication, multilingual support, AWS hosting, and CI/CD deployment in one project.
