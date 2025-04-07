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
        # Requête SQL directe pour éviter les problèmes de conversion UUID
        from django.db import connection
        
        user_id = request.user.id
        tickets_data = []
        
        with connection.cursor() as cursor:
            # Utiliser une requête SQL directe qui ne dépend pas de la conversion UUID
            cursor.execute("""
                SELECT 
                    t.id, t.category, t.price, t.purchase_date, 
                    e.start, 
                    home.name as team_home_name, 
                    away.name as team_away_name, 
                    s.name as stadium_name
                FROM 
                    mainapp_ticket t
                JOIN 
                    mainapp_event e ON t.event_id = e.id
                JOIN 
                    mainapp_stadium s ON e.stadium_id = s.id
                LEFT JOIN 
                    mainapp_team home ON e.team_home_id = home.id
                LEFT JOIN 
                    mainapp_team away ON e.team_away_id = away.id
                WHERE 
                    t.user_id = %s
            """, [user_id])
            
            columns = [col[0] for col in cursor.description]
            tickets_raw = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            for ticket in tickets_raw:
                tickets_data.append({
                    'id': ticket['id'],
                    'match': {
                        'team_home': ticket['team_home_name'] or "À déterminer",
                        'team_away': ticket['team_away_name'] or "À déterminer",
                        'stadium': ticket['stadium_name'],
                        'start': ticket['start'],
                    },
                    'category': ticket['category'],
                    'price': str(ticket['price']),
                    'purchase_date': ticket['purchase_date'],
                    'qr_code_data': ticket['id']
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
        
        # Créer le ticket avec un UUID correctement formaté
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
                "id": str(ticket.id),
                "match": {
                    "team_home": team_home_name,
                    "team_away": team_away_name,
                    "stadium": stadium_name,
                    "start": event.start
                },
                "category": ticket.category,
                "price": str(ticket.price),
                "qr_code_data": str(ticket.id)
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
        # Utiliser directement l'ID sans conversion UUID
        from django.db import connection
        
        ticket_data = None
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    t.id, t.category, t.price, 
                    e.start, 
                    home.name as team_home_name, 
                    away.name as team_away_name, 
                    s.name as stadium_name,
                    u.username
                FROM 
                    mainapp_ticket t
                JOIN 
                    mainapp_event e ON t.event_id = e.id
                JOIN 
                    mainapp_stadium s ON e.stadium_id = s.id
                JOIN
                    auth_user u ON t.user_id = u.id
                LEFT JOIN 
                    mainapp_team home ON e.team_home_id = home.id
                LEFT JOIN 
                    mainapp_team away ON e.team_away_id = away.id
                WHERE 
                    t.id = %s
            """, [ticket_id])
            
            result = cursor.fetchone()
            
            if not result:
                return Response({
                    "valid": False,
                    "message": "Billet non trouvé"
                }, status=status.HTTP_404_NOT_FOUND)
                
            columns = [col[0] for col in cursor.description]
            ticket_data = dict(zip(columns, result))
        
        return Response({
            "valid": True,
            "ticket": {
                "id": ticket_data['id'],
                "match": {
                    "name": f"{ticket_data['team_home_name'] or 'À déterminer'} vs {ticket_data['team_away_name'] or 'À déterminer'}",
                    "start": ticket_data['start'],
                    "team_home": ticket_data['team_home_name'] or "À déterminer",
                    "team_away": ticket_data['team_away_name'] or "À déterminer",
                    "stadium": ticket_data['stadium_name']
                },
                "category": ticket_data['category'],
                "price": str(ticket_data['price']),
                "user": ticket_data['username']
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({
            "valid": False,
            "message": f"Erreur lors de la vérification du billet: {str(e)}"
        }, status=status.HTTP_400_BAD_REQUEST)