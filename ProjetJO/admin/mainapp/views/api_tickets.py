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
        tickets = Ticket.objects.filter(user=request.user).select_related('event', 'event__stadium', 'event__team_home', 'event__team_away')
        
        tickets_data = []
        for ticket in tickets:
            tickets_data.append({
                'id': ticket.id,
                'match': {
                    'id': ticket.event.id,
                    'team_home': ticket.event.team_home.name if ticket.event.team_home else "À déterminer",
                    'team_away': ticket.event.team_away.name if ticket.event.team_away else "À déterminer",
                    'stadium': ticket.event.stadium.name,
                    'start': ticket.event.start,
                },
                'category': ticket.category,
                'price': str(ticket.price),
                'purchase_date': ticket.purchase_date,
                'qr_code_data': ticket.id  # Simplifier pour utiliser directement l'ID
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
        
        # Récupérer les informations du match pour la réponse
        team_home_name = event.team_home.name if event.team_home else "À déterminer"
        team_away_name = event.team_away.name if event.team_away else "À déterminer"
        stadium_name = event.stadium.name
        
        return Response({
            "message": "Billet acheté avec succès",
            "ticket": {
                "id": ticket.id,
                "match": {
                    "id": event.id,
                    "team_home": team_home_name,
                    "team_away": team_away_name,
                    "stadium": stadium_name,
                    "start": event.start
                },
                "category": ticket.category,
                "price": str(ticket.price),
                "qr_code_data": ticket.id
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
        # Nettoyer l'ID du ticket
        clean_ticket_id = ticket_id.strip()
        
        print(f"Vérification du ticket ID: {clean_ticket_id}")
        
        # Récupérer le ticket
        ticket = Ticket.objects.select_related(
            'event', 'event__stadium', 'event__team_home', 'event__team_away', 'user'
        ).get(id=clean_ticket_id)
        
        # Informations de l'événement
        team_home_name = ticket.event.team_home.name if ticket.event.team_home else "À déterminer"
        team_away_name = ticket.event.team_away.name if ticket.event.team_away else "À déterminer"
        
        # Vérifier si le ticket est déjà utilisé
        already_used = ticket.used
        
        # Marquer le ticket comme utilisé s'il ne l'est pas déjà
        if not ticket.used:
            ticket.used = True
            ticket.save()
        
        return Response({
            "valid": True,
            "ticket": {
                "id": ticket.id,
                "match": {
                    "id": ticket.event.id,
                    "name": f"{team_home_name} vs {team_away_name}",
                    "start": ticket.event.start,
                    "team_home": team_home_name,
                    "team_away": team_away_name,
                    "stadium": ticket.event.stadium.name
                },
                "category": ticket.category,
                "price": str(ticket.price),
                "user": ticket.user.username,
                "already_used": already_used  # Indique si le ticket était déjà utilisé avant
            }
        })
    except Ticket.DoesNotExist:
        print(f"Ticket non trouvé: {ticket_id}")
        return Response({
            "valid": False,
            "message": "Billet non trouvé"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({
            "valid": False,
            "message": f"Erreur lors de la vérification du billet: {str(e)}"
        }, status=status.HTTP_400_BAD_REQUEST)