from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from mainapp.models.event import Event
from mainapp.models.ticket import Ticket
from django.utils import timezone
import uuid

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_user_tickets(request):
    """Récupère tous les billets de l'utilisateur connecté"""
    try:
        # Utiliser select_related pour charger les données liées en une seule requête
        tickets = Ticket.objects.filter(user=request.user).select_related('event', 'event__stadium', 'event__team_home', 'event__team_away')
        tickets_data = []
        
        for ticket in tickets:
            # Accéder aux données de manière sécurisée
            event = ticket.event
            team_home_name = event.team_home.name if event.team_home else "À déterminer"
            team_away_name = event.team_away.name if event.team_away else "À déterminer"
            stadium_name = event.stadium.name if event.stadium else "À déterminer"
            
            # Construire l'objet de réponse
            tickets_data.append({
                'id': str(ticket.id),
                'match': {
                    'team_home': team_home_name,
                    'team_away': team_away_name,
                    'stadium': stadium_name,
                    'start': event.start,
                },
                'category': ticket.category,
                'price': str(ticket.price),
                'purchase_date': ticket.purchase_date,
                'qr_code_data': ticket.qr_code_data
            })
        
        return Response(tickets_data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"message": f"Erreur lors de la récupération des billets: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buy_ticket(request):
    """Achète un nouveau billet"""
    try:
        data = request.data
        print("Données reçues:", data)
        
        # Solution simple : utiliser directement match_id
        match_id = data.get('match_id')
        category = data.get('category')
        
        if not match_id or not category:
            return Response({
                "message": "Le match et la catégorie sont requis"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Récupérer l'événement correspondant
        try:
            event = Event.objects.get(id=match_id)
        except Event.DoesNotExist:
            return Response({
                "message": "Match non trouvé"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Vérifier la catégorie
        valid_categories = ['Silver', 'Gold', 'Platinum']
        if category not in valid_categories:
            return Response({
                "message": f"Catégorie invalide: {category}. Choisissez parmi: {', '.join(valid_categories)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Créer le ticket
        ticket = Ticket(
            event=event,
            user=request.user,
            category=category
        )
        ticket.save()
        
        return Response({
            "message": "Billet acheté avec succès",
            "ticket": {
                "id": str(ticket.id),
                "match": {
                    "team_home": event.team_home.name if event.team_home else "À déterminer",
                    "team_away": event.team_away.name if event.team_away else "À déterminer",
                    "stadium": event.stadium.name,
                    "start": event.start
                },
                "category": ticket.category,
                "price": str(ticket.price),
                "qr_code_data": ticket.qr_code_data
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
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
                "id": str(ticket.id),
                "match": {
                    "name": f"{ticket.event.team_home.name if ticket.event.team_home else 'À déterminer'} vs {ticket.event.team_away.name if ticket.event.team_away else 'À déterminer'}",
                    "start": ticket.event.start,
                    "team_home": ticket.event.team_home.name if ticket.event.team_home else "À déterminer",
                    "team_away": ticket.event.team_away.name if ticket.event.team_away else "À déterminer",
                    "stadium": ticket.event.stadium.name
                },
                "category": ticket.category,
                "price": str(ticket.price),
                "user": ticket.user.username
            }
        })
    except Ticket.DoesNotExist:
        return Response({
            "valid": False,
            "message": "Billet non trouvé"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            "valid": False,
            "message": f"Erreur lors de la vérification du billet: {str(e)}"
        }, status=status.HTTP_400_BAD_REQUEST)