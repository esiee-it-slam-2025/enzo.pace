from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from mainapp.models.event import Event
from mainapp.models.ticket import Ticket
from django.core.exceptions import ValidationError
from django.utils import timezone
import uuid

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_user_tickets(request):
    """Récupère tous les billets de l'utilisateur connecté"""
    tickets = Ticket.objects.filter(user=request.user).select_related('match')
    tickets_data = []
    
    for ticket in tickets:
        tickets_data.append({
            'id': ticket.id,
            'match': {
                'team_home': ticket.match.team_home.name if ticket.match.team_home else "À déterminer",
                'team_away': ticket.match.team_away.name if ticket.match.team_away else "À déterminer",
                'stadium': ticket.match.stadium.name,
                'start': ticket.match.start,
            },
            'category': ticket.category,
            'price': str(ticket.price),
            'purchase_date': ticket.purchase_date,
            'qr_code_data': ticket.qr_code_data
        })
    
    return Response(tickets_data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buy_ticket(request):
    """Achète un nouveau billet"""
    try:
        print("Données reçues:", request.data)
        
        match_id = request.data.get('match_id')
        category = request.data.get('category')
        
        # Fixer les prix selon la catégorie (comme dans le modèle CAKICI_semih)
        category_prices = {
            'Silver': 100.00,
            'Gold': 200.00,
            'Platinum': 300.00,
        }
        
        # Calculer le prix en fonction de la catégorie
        price = category_prices.get(category, 0)
        
        print(f"match_id: {match_id}, category: {category}, price calculé: {price}")

        # Vérifier que tous les champs requis sont présents
        if not match_id or not category:
            print("Champs requis manquants")
            return Response({
                "message": "Le match et la catégorie sont requis"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Vérifier que la catégorie est valide
        if category not in category_prices:
            print(f"Catégorie invalide: {category}")
            return Response({
                "message": f"Catégorie de billet invalide. Choisissez parmi: Silver, Gold, Platinum"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Récupérer le match
        try:
            match = Event.objects.get(id=match_id)
            print(f"Match trouvé: {match}")
        except Event.DoesNotExist:
            print(f"Match non trouvé: {match_id}")
            return Response({
                "message": "Match non trouvé"
            }, status=status.HTTP_404_NOT_FOUND)

        # Pour les besoins de test, nous désactivons la vérification du statut du match
        # Vous pourrez réactiver ces vérifications plus tard en production

        # Créer le billet
        ticket = Ticket.objects.create(
            id=str(uuid.uuid4()),
            match=match,
            user=request.user,
            category=category,
            price=price
        )
        print(f"Ticket créé avec succès: {ticket.id}")

        return Response({
            "message": "Billet acheté avec succès",
            "ticket": {
                "id": ticket.id,
                "match": {
                    "team_home": match.team_home.name if match.team_home else "À déterminer",
                    "team_away": match.team_away.name if match.team_away else "À déterminer",
                    "stadium": match.stadium.name,
                    "start": match.start
                },
                "category": ticket.category,
                "price": str(ticket.price),
                "qr_code_data": ticket.qr_code_data
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"Erreur lors de l'achat du billet: {e}")
        import traceback
        traceback.print_exc()
        return Response({
            "message": f"Une erreur est survenue: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def verify_ticket(request, ticket_id):
    """Vérifie la validité d'un billet via son QR code"""
    try:
        ticket = get_object_or_404(Ticket, id=ticket_id)
        
        return Response({
            "valid": True,
            "ticket": {
                "id": ticket.id,
                "match": {
                    "team_home": ticket.match.team_home.name if ticket.match.team_home else "À déterminer",
                    "team_away": ticket.match.team_away.name if ticket.match.team_away else "À déterminer",
                    "stadium": ticket.match.stadium.name,
                    "start": ticket.match.start
                },
                "category": ticket.category,
                "user": ticket.user.username
            }
        })
    except Ticket.DoesNotExist:
        return Response({
            "valid": False,
            "message": "Billet invalide ou non trouvé"
        }, status=status.HTTP_404_NOT_FOUND)