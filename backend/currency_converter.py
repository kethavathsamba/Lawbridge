"""Currency conversion utilities for INR to POL conversion."""

# Exchange rates (same as frontend for consistency)
# 1 POL ≈ $0.80 USD
# 1 USD ≈ 83 INR
# Therefore: 1 POL ≈ 66.4 INR

POL_TO_USD = 0.80  # 1 POL = $0.80 USD
USD_TO_INR = 83    # 1 USD = 83 INR
POL_TO_INR = POL_TO_USD * USD_TO_INR  # 1 POL ≈ 66.4 INR


def convert_inr_to_pol(amount_inr: float) -> float:
    """
    Convert INR (Indian Rupees) to POL (Polygon)
    
    Args:
        amount_inr: Amount in Indian Rupees
    
    Returns:
        Amount in POL with 4 decimal places precision
    """
    if not amount_inr or amount_inr <= 0:
        return 0.0
    
    amount_usd = amount_inr / USD_TO_INR
    amount_pol = amount_usd / POL_TO_USD
    
    # Return with 4 decimal places precision
    return round(amount_pol, 4)


def convert_pol_to_inr(amount_pol: float) -> int:
    """
    Convert POL (Polygon) to INR (Indian Rupees)
    
    Args:
        amount_pol: Amount in POL
    
    Returns:
        Amount in INR as integer
    """
    if not amount_pol or amount_pol <= 0:
        return 0
    
    amount_usd = amount_pol * POL_TO_USD
    amount_inr = amount_usd * USD_TO_INR
    
    # Return as integer (no decimal for rupees)
    return round(amount_inr)


def get_exchange_rate_info() -> dict:
    """Get current exchange rate information"""
    return {
        "POL_TO_USD": POL_TO_USD,
        "USD_TO_INR": USD_TO_INR,
        "POL_TO_INR": round(POL_TO_INR, 2),
    }
