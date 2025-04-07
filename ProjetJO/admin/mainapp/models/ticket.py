from django.db import models
import uuid

class Ticket(models.Model):
    CATEGORY_CHOICES = [
        ('Silver', 'Silver'),
        ('Gold', 'Gold'),
        ('Platinum', 'Platinum'),
    ]

    # Utiliser un UUID lisible
    id = models.CharField(primary_key=True, max_length=36, default=uuid.uuid4, editable=False)
    event = models.ForeignKey('Event', on_delete=models.CASCADE, related_name='tickets')
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='tickets')
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES)
    price = models.DecimalField(max_digits=6, decimal_places=2)
    purchase_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ticket {self.id} - {self.event} - {self.category}"

    @property
    def qr_code_data(self):
        """
        Renvoie les données à encoder dans le QR code.
        Utiliser un format lisible et structuré
        """
        return f"ID:{self.id}|Event:{self.event.id}|Category:{self.category}"
        
    def save(self, *args, **kwargs):
        # Définir le prix en fonction de la catégorie
        category_prices = {
            'Silver': 100.00,
            'Gold': 200.00,
            'Platinum': 300.00,
        }
        self.price = category_prices.get(self.category, 0.00)
        super().save(*args, **kwargs)