const products = [
    // NON-COFFEE
    {name : "Strawberries & Cream", image : "strawberry.png", price : 170},
    {name : "Matcha", image : "matcha.png", price : 170},
    {name : "Chocolate Cereal", image : "choco.png", price : 160},

    // SIGNATURE
    {name : "Breakfast Latte", image : "breakfast2.png", price : 160},
    {name : "Salted Caramel Latte", image : "horchata.png", price : 170},
    {name : "Toasted Vanilla Oat Shakerato", image : "toasted.png", price : 170},

    // BEST SELLERS
    {name : "Bacon & Mushroom Frittata", image : "bacon-mushroom.jpg", price : 280},
    {name : "Buttered Croissant", image : "buttered.jpg", price : 90},
    {name : "Chicken & Waffles", image : "chicken-waffles.jpg", price : 270},

    // SANDWICHES
    { name : "Chicken Burger", image : "chicken.jpg", price : 290 },
    { name : "Chili Cheese Dog", image : "cheese-dog.jpg", price : 280 },
    { name : "Caution Clubhouse", image : "clubhouse.jpg", price : 280 },

    // MERCH
    {
        image: 'shirt-b.png',
        price: 800,
        name: 'Caution Coffee T-Shirt (Black)'
      },
      { image: 'sticker.png', price: 100, name: 'Stickers' },
      {
        image: 'shirt-c.png',
        price: 800,
        name: 'Caution Coffee T-Shirt (Beige)'
      },

    // COFFEE & BREW GEAR
    {
        image: 'hot-coffee-cup.png',
        price: 150,
        category: 'cups',
        name: 'Hot Cup (25 pcs per pack)'
      },
      {
        price: 140,
        name: 'Blended Cup (25 pcs per cup)',
        category: 'cups',
        image: 'blended-cup.png'
      },
      {
        category: 'cups',
        price: 140,
        name: 'Iced Cup (25 pcs per pack)',
        image: 'iced-cup.png'
      },
      {
        image: 'full-cream-milk.png',
        name: 'Happy Barn Full Cream Milk',
        price: 85,
        category: 'milk'
      },
      {
        price: 170,
        image: 'soy-milk.png',
        category: 'milk',
        name: 'Soy Milk'
      },
      {
        name: 'Dairy Milk',
        category: 'milk',
        price: 100,
        image: 'dairy-milk.png'
      },
      {
        category: 'milk',
        name: 'Oat Milk',
        image: 'oat-milk.png',
        price: 180
      },
      {
        price: 550,
        image: 'vanilla.png',
        category: 'syrups',
        name: 'Vanilla Syrup'
      },
      {
        category: 'beans',
        name: 'Homeground (250g)',
        price: 950,
        image: 'coffee-beans.png'
      },
      {
        category: 'beans',
        price: 950,
        name: 'H Proper (250g)',
        image: 'toh-beans.png'
      },
      {
        price: 550,
        category: 'syrups',
        image: 'butterscotch.png',
        name: 'Butterscotch Syrup'
      },
      {
        category: 'brew_gear',
        image: 'hybrid-grinder.png',
        name: 'EVO Hybrid Grinder',
        price: 14700
      },
      {
        category: 'brew_gear',
        name: 'Steep Cold Brew Bottle',
        price: 2700,
        image: 'cold-brew-bottle.png'
      },
      {
        image: 'rasberry.png',
        name: 'Raspberry Syrup',
        category: 'syrups',
        price: 550
      },
      {
        category: 'beans',
        image: 'factory-beans.png',
        price: 950,
        name: 'Factory Sirinya-Lactic (250g)'
      },
      {
        price: 200,
        category: 'brew_gear',
        image: 'moka-pot.png',
        name: 'Moka Pot'
      },
      {
        name: 'AKU Micro Scale',
        price: 7000,
        category: 'brew_gear',
        image: 'micro-scale.png'
      },
      {
        name: 'Rocket Machine Espresso',
        image: 'machine.png',
        price: 115000,
        category: 'brew_gear'
      },
      {
        category: 'milk',
        image: 'almond-milk.png',
        price: 180,
        name: 'Almond Milk'
      },
      {
        image: 'whipping-cream.png',
        category: 'milk',
        price: 220,
        name: 'Ken Presto Whipping Cream'
      }
]

export default products;