from crewai import Agent
from langchain.tools import tool

# --- Custom Tools ---
@tool("Market Price Verifier")
def market_price_tool(item: str):
    """Checks the current market price of an agricultural input."""
    # Mock Logic for Hackathon
    prices = {
        "Urea": 600,
        "DAP": 1350,
        "Seeds": 400
    }
    for key in prices:
        if key.lower() in item.lower():
            return f"Verified Price for {key}: \u20b9{prices[key]}/bag. Market Rate Confirmed."
    return f"Price verification failed for {item}. using Standard Rate \u20b9500/unit."

@tool("Payment Executor")
def execute_payment_tool(amount: str, vendor_id: str):
    """Executes a UPI transaction to the vendor."""
    return f"Transaction Successful: Paid {amount} to Vendor ID {vendor_id}. TxHash: #txn_778899."

@tool("Harvest Sale Listener")
def harvest_sale_tool(farmer_id: str):
    """Simulates a harvest sale and deducts loan amount."""
    # Mock Logic
    sale_amount = 50000
    loan_amount = 12000
    net_profit = sale_amount - loan_amount
    return f"Harvest Sale Detected provided by Farmer {farmer_id}: \u20b9{sale_amount}. Deducted Loan: \u20b9{loan_amount}. Net Disbursed: \u20b9{net_profit}."

class PurposePayAgents:
    def broker_agent(self):
        return Agent(
            role='The Broker (Verification)',
            goal='Verify the market price of the requested item to prevent invoice inflation.',
            backstory="""You are an expert procurement specialist. Your job is to ensure 
            that farmers are not being overcharged by vendors. You cross-reference requests 
            with real-time market data.""",
            tools=[market_price_tool],
            verbose=True,
            allow_delegation=False
        )

    def escrow_agent(self):
        return Agent(
            role='The Escrow (Transaction)',
            goal='Execute secure payments directly to vendors upon verification.',
            backstory="""You are the financial controller of the system. You ensure that 
            funds are NEVER transferred to the borrower's personal account. You pay 
            the vendor directly via UPI only after the Broker verifies the purchase.""",
            tools=[execute_payment_tool],
            verbose=True,
            allow_delegation=False
        )

    def recovery_agent(self):
        return Agent(
            role='The Recovery (Deduction)',
            goal='Automate loan repayment from future harvest sales.',
            backstory="""You are connected to the agricultural marketplace. When a farmer 
            sells their produce, you instantly intercept the revenue to repay the loan 
            before releasing the remaining profit to the farmer.""",
            tools=[harvest_sale_tool],
            verbose=True,
            allow_delegation=False
        )
