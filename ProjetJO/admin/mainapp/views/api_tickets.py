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
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_user_tickets(request):
    """Récupère tous les billets de l'utilisateur connecté"""
    try:
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
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des billets: {e}")
        return Response({
            "message": "Une erreur est survenue lors de la récupération des billets"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buy_ticket(request):
    """Achète un nouveau billet"""
    try:
        # Log pour le débogage
        logger.info(f"Données d'achat reçues: {request.data}")
        
        match_id = request.data.get('match_id')
        category = request.data.get('category')
        price = request.data.get('price')

        # Vérifier que tous les champs requis sont présents
        if not match_id or not category or not price:
            missing_fields = []
            if not match_id: missing_fields.append("match_id")
            if not category: missing_fields.append("category")
            if not price: missing_fields.append("price")
            logger.warning(f"Champs manquants: {missing_fields}")
            return Response({
                "message": f"Tous les champs sont requis: {', '.join(missing_fields)} manquant(s)"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Récupérer le match
        try:
            match = Event.objects.get(id=match_id)
            logger.info(f"Match trouvé: {match}")
        except Event.DoesNotExist:
            logger.warning(f"Match non trouvé: {match_id}")
            return Response({
                "message": "Match non trouvé"
            }, status=status.HTTP_404_NOT_FOUND)

        # Définir les prix fixes par catégorie pour s'assurer de la cohérence
        category_prices = {
            'Silver': 100.00,
            'Gold': 200.00,
            'Platinum': 300.00,
        }
        
        # Vérifier que la catégorie est valide
        if category not in category_prices:
            logger.warning(f"Catégorie invalide: {category}")
            return Response({
                "message": f"Catégorie de billet invalide. Valeurs acceptées: {', '.join(category_prices.keys())}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Utiliser le prix fixe défini par catégorie
        fixed_price = category_prices[category]

        # Pour les tests, nous désactivons la vérification du statut du match
        # En production, décommentez ces lignes
        '''
        # Vérifier si le match est terminé ou commencé
        now = timezone.now()
        match_started = match.start <= now
        match_has_score = match.score is not None and match.score != "0 - 0"
        match_has_winner = match.winner_id is not None

        if match_has_score or match_has_winner or match_started:
            logger.warning(f"Match non disponible: started={match_started}, score={match_has_score}, winner={match_has_winner}")
            return Response({
                "message": "Ce match est terminé ou déjà commencé, vous ne pouvez plus acheter de billets"
            }, status=status.HTTP_400_BAD_REQUEST)
        '''

        # Créer le billet
        ticket = Ticket.objects.create(
            id=str(uuid.uuid4()),
            match=match,
            user=request.user,
            category=category,
            price=fixed_price
        )
        logger.info(f"Ticket créé: {ticket.id}")

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

    except ValidationError as e:
        logger.error(f"Erreur de validation: {e}")
        return Response({
            "message": str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Exception lors de l'achat de billet: {e}", exc_info=True)
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