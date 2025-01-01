import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);


// Function to fetch exchange rates and update Supabase
const updateExchangeRates = async () => {
  try {
    const response = await fetch("https://v6.exchangerate-api.com/v6/5db8fdd191d0c7086aa74c48/latest/USD");
    const data = await response.json();

    if (data.result === "success") {
      console.log("Exchange Rates fetched successfully!");

      const rates = data.conversion_rates;
      for (let currencyCode in rates) {
        const rate = rates[currencyCode];

        const { data: insertedData, error } = await supabase
          .from('exchange_rates')
          .upsert([
            {
              currency_code: currencyCode,
              rate: rate,
              base_code: 'USD',
            },
          ], { onConflict: ['currency_code'] });

        if (error) {
          console.error(`Error inserting ${currencyCode}:`, error);
        } else {
          console.log(`Inserted/Updated rate for ${currencyCode}: ${rate}`);
        }
      }
    } else {
      console.error("Error fetching exchange rates:", data);
    }
  } catch (error) {
    console.error("Error in fetch operation:", error);
  }
};

// Netlify function handler
export const handler = async (event, context) => {
  if (event.path === '/update-rates' && event.httpMethod === 'GET') {
    await updateExchangeRates();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Exchange rates updated!" }),
    };
  }

  if (event.path === '/exchange-rates' && event.httpMethod === 'GET') {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('currency_code, rate')
        .order('currency_code', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ exchange_rates: data }),
      };
    } catch (error) {
      console.error("Error fetching data from database:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: "Not Found" }),
  };
};
