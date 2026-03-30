from crewai import Task
from textwrap import dedent

class PurposePayTasks:

    def verify_purchase_task(self, agent, item, quantity, vendor_id):
        return Task(
            description=dedent(f"""
                Analyze the user's request to purchase {quantity} of {item} from Vendor {vendor_id}.
                Use the 'Market Price Verifier' tool to confirm the price is fair.
                If verified, create a purchase order.
            """),
            expected_output=dedent("""
                A verified purchase order summary including the Total Amount and Verification Status.
            """),
            agent=agent
        )

    def execute_payment_task(self, agent, purchase_order):
        return Task(
            description=dedent(f"""
                Take the verified purchase order: {purchase_order}.
                Use the 'Payment Executor' tool to transfer the exact amount to the Vendor.
                Ensure no funds are sent to the user.
            """),
            expected_output=dedent("""
                A payment confirmation receipt with Transaction ID.
            """),
            agent=agent
        )

    def recover_loan_task(self, agent, farmer_id):
        return Task(
            description=dedent(f"""
                Monitor the marketplace for sales by Farmer {farmer_id}.
                Use the 'Harvest Sale Listener' tool.
                If a sale occurs, deduct the loan amount + interest immediately.
            """),
            expected_output=dedent("""
                A final settlement statement showing Total Sale, Deductions, and Net Profit.
            """),
            agent=agent
        )
