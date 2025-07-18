# Generated by Django 5.2.4 on 2025-07-12 20:39

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trade', '0005_trade_is_closed_trade_ratio'),
    ]

    operations = [
        migrations.AddField(
            model_name='trade',
            name='close_requested_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='trade',
            name='fills_received_of',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=10),
        ),
        migrations.AddField(
            model_name='trade',
            name='fills_recivied_for',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=10),
        ),
    ]
