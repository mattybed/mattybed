# eBay Store Integration Example

This repository contains a simple Node.js website that fetches products from an eBay UK store using the eBay Finding API and displays them with options for sorting and filtering.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the following environment variables:
   - `EBAY_APP_ID` – your eBay App ID.
   - `EBAY_STORE` – the name of the eBay store to import products from.

3. Start the server:
   ```bash
   node server.js
   ```

The site will be available at `http://localhost:3000` and display products from the configured store.

## Features

This application allows users to browse products from a specified eBay store with the following functionalities:

*   **Product Listing**: Displays products with their thumbnail image, title, price, and a direct link to the eBay item page.
*   **Sorting**: Users can sort products using a dropdown menu. Available sort options include:
    *   Default (Best Match as returned by eBay)
    *   Price: Low to High
    *   Price: High to Low
    *   Title (A-Z, case-insensitive)
*   **Filtering**: Users can refine the product list using several filters:
    *   **Minimum Price**: Sets a lower price boundary for displayed products.
    *   **Maximum Price**: Sets an upper price boundary for displayed products.
    *   **Keywords**: Filters products to include only those whose titles contain the entered keywords (case-insensitive).
    *   Filters are applied by clicking the "Apply Filters" button.

Both client-side (JavaScript in browser) and server-side (Node.js) logic is implemented for sorting and filtering. The server attempts to use eBay API parameters for these operations first, and then applies any further specified sorting/filtering on the retrieved results.

## Future Enhancements

This project serves as a basic example and can be extended with many more features. Some potential next steps include:

*   **Pagination**: For stores with a large number of products, implementing pagination would improve performance and user experience.
*   **Advanced Search Options**: Integrate more specific eBay API filters if applicable (e.g., item condition, buying format like "Auction" or "FixedPrice").
*   **Detailed Product View**: Clicking an item could navigate to a dedicated page or expand a section showing more product details (e.g., full description, larger images) if available from the API.
*   **Saved Items/Wishlist**: Allow users to save items they are interested in, possibly using browser local storage.
*   **Recently Viewed Items**: Keep track of items a user has clicked on or viewed, storing this information in local storage for easy access.
*   **Improved UI/UX**: Enhance the visual design, responsiveness for different screen sizes, and overall user interaction.
*   **Robust Error Handling**: More specific error messages and user feedback for API errors or input validation issues.
*   **User Accounts & Price Alerts**: For more advanced functionality, consider user accounts to save preferences and potentially set up price alerts for specific items.
*   **Configuration File**: Move settings like `GLOBAL-ID` (eBay site) or default items per page to a configuration file.
*   **Automated Tests**: Add unit and integration tests for both backend and frontend logic.

<!---
The placeholder content below this line from the original README has been removed.
--->
