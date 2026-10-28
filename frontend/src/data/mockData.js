export const sampleListings = [
  {
    _id: 'mock-1',
    title: 'Hero Sprint Pro 21-Speed Mountain Cycle',
    category: 'cycle',
    description: 'Barely used for 2 semesters. Well maintained with dual disc brakes, front suspension, and newly fitted gel seat cover. Includes combination lock.',
    condition: 'Like New',
    photos: [
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=800&q=80'
    ],
    startingPrice: 3500,
    currentBid: 4200,
    minIncrement: 100,
    closingTime: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(), // 18 hours from now
    status: 'active',
    sellerId: { _id: 'seller1', name: 'Rohan (Final Year Mech)' },
    bids: [
      { _id: 'b1', amount: 3700, createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), bidderId: { name: 'Aryan K.' } },
      { _id: 'b2', amount: 4000, createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), bidderId: { name: 'Pooja S.' } },
      { _id: 'b3', amount: 4200, createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), bidderId: { name: 'Vikas M.' } }
    ],
    questions: [
      { _id: 'q1', question: 'Can I test ride it near Hostel 4 before bidding?', answer: 'Yes, available today 5-7 PM near mess gate.' },
      { _id: 'q2', question: 'Does it come with air pump?', answer: 'Yes, mini hand pump is included.' }
    ]
  },
  {
    _id: 'mock-2',
    title: 'Casio fx-991EX ClassWiz Scientific Calculator',
    category: 'calculator',
    description: 'Original Casio scientific calculator with 552 functions and high-resolution LCD. Crucial for engineering math, physics, and exam approved.',
    condition: 'Like New',
    photos: [
      'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80'
    ],
    startingPrice: 600,
    currentBid: 950,
    minIncrement: 50,
    closingTime: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(), // 6 hours from now
    status: 'active',
    sellerId: { _id: 'seller2', name: 'Neha (Civil Engg)' },
    bids: [
      { _id: 'b4', amount: 750, createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), bidderId: { name: 'Rahul D.' } },
      { _id: 'b5', amount: 950, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), bidderId: { name: 'Aditi T.' } }
    ],
    questions: [
      { _id: 'q3', question: 'Is the battery new?', answer: 'Original solar + battery works flawlessly.' }
    ]
  },
  {
    _id: 'mock-3',
    title: 'Engineering Mathematics & Data Structures Bundle (Coreman + Erwin)',
    category: 'books',
    description: 'Set of 4 core books: CLRS Introduction to Algorithms, Advanced Engineering Mathematics by Erwin Kreyszig, and Computer Networks by Tanenbaum.',
    condition: 'Good',
    photos: [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'
    ],
    startingPrice: 800,
    currentBid: 1100,
    minIncrement: 50,
    closingTime: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(), // 36 hours
    status: 'active',
    sellerId: { _id: 'seller3', name: 'Karthik (CS Senior)' },
    bids: [
      { _id: 'b6', amount: 900, createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(), bidderId: { name: 'Dev R.' } },
      { _id: 'b7', amount: 1100, createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), bidderId: { name: 'Shreya P.' } }
    ],
    questions: [
      { _id: 'q4', question: 'Are there pencil highlights inside?', answer: 'Minor neat pencil markings on only 2 chapters.' }
    ]
  },
  {
    _id: 'mock-4',
    title: 'Sony WH-CH520 Wireless Bluetooth Headphones',
    category: 'electronics',
    description: '50-hour battery life with multipoint connection and DSEE sound. Black color with original charging cable and box. Perfect for study sessions.',
    condition: 'New',
    photos: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
    ],
    startingPrice: 1800,
    currentBid: 2400,
    minIncrement: 100,
    closingTime: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(), // 2 hours
    status: 'active',
    sellerId: { _id: 'seller4', name: 'Tanmay (ECE)' },
    bids: [
      { _id: 'b8', amount: 2000, createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), bidderId: { name: 'Manish S.' } },
      { _id: 'b9', amount: 2400, createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), bidderId: { name: 'Ananya G.' } }
    ],
    questions: []
  },
  {
    _id: 'mock-5',
    title: 'Ergonomic Mesh Study Chair with Adjustable Lumbar',
    category: 'other',
    description: 'High-back mesh chair bought for hostel room desk. Breathable backrest, smooth caster wheels, and pneumatic height adjustment.',
    condition: 'Good',
    photos: [
      'https://images.unsplash.com/photo-1580481077195-c3f99583d7f9?auto=format&fit=crop&w=800&q=80'
    ],
    startingPrice: 1200,
    currentBid: 1600,
    minIncrement: 50,
    closingTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    status: 'active',
    sellerId: { _id: 'seller5', name: 'Varun (Hostel 8)' },
    bids: [
      { _id: 'b10', amount: 1400, createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(), bidderId: { name: 'Siddharth' } },
      { _id: 'b11', amount: 1600, createdAt: new Date(Date.now() - 1000 * 60 * 100).toISOString(), bidderId: { name: 'Gaurav' } }
    ],
    questions: []
  }
];
