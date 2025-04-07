from django.db import models
import uuid


class Ticket(models.Model):
    CATEGORY_CHOICES = [
        ('Silver', 'Silver'),
        ('Gold', 'Gold'),
        ('Platinum', 'Platinum'),
    ]

    id = models.CharField(primary_key=True, max_length=36, default=uuid.uuid4, editable=False)
    match = models.ForeignKey('Event', on_delete=models.CASCADE, related_name='tickets')
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='tickets')
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES)
    price = models.DecimalField(max_digits=6, decimal_places=2)
    purchase_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ticket {self.id} - {self.match} - {self.category}"

    @property
    def qr_code_data(self):
        """Return the data to encode in the QR code."""
        return str(self.id)