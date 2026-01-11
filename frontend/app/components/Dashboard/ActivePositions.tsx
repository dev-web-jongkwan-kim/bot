'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { Position } from '../../types/trading.types';

interface ActivePositionsProps {
  positions: Position[];
  onClose: (positionId: number) => void;
}

export const ActivePositions: React.FC<ActivePositionsProps> = ({
  positions,
  onClose,
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Active Positions ({positions.length})
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Side</TableCell>
                <TableCell>Entry</TableCell>
                <TableCell>Current</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Leverage</TableCell>
                <TableCell>Unrealized PnL</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {position.symbol}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {position.strategy}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={position.side}
                      size="small"
                      color={position.side === 'LONG' ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>${position.entryPrice.toFixed(6)}</TableCell>
                  <TableCell>${position.currentPrice.toFixed(6)}</TableCell>
                  <TableCell>{position.quantity.toFixed(6)}</TableCell>
                  <TableCell>{position.leverage}x</TableCell>
                  <TableCell>
                    <Typography
                      color={position.unrealizedPnl >= 0 ? 'success.main' : 'error.main'}
                      fontWeight="bold"
                    >
                      ${position.unrealizedPnl.toFixed(2)}
                      <br />
                      <Typography variant="caption">
                        ({position.unrealizedPnlPercent >= 0 ? '+' : ''}
                        {position.unrealizedPnlPercent.toFixed(2)}%)
                      </Typography>
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label="Close"
                      size="small"
                      onClick={() => onClose(position.id)}
                      clickable
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
