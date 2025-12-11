import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ParsedTransaction, TransactionCategory, CATEGORY_OPTIONS } from "./types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TransactionsTableProps {
  transactions: ParsedTransaction[];
  currency: string;
  onCategoryChange?: (index: number, category: TransactionCategory) => void;
}

const PAGE_SIZE = 20;

export function TransactionsTable({ transactions, currency, onCategoryChange }: TransactionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const currentTransactions = transactions.slice(startIndex, endIndex);

  const formatCurrency = (value: number) => `${currency}${value.toFixed(2)}`;

  const subscriptionOptions = CATEGORY_OPTIONS.filter(opt => opt.group === "subscription");
  const welcomeOptions = CATEGORY_OPTIONS.filter(opt => opt.group === "welcome");
  const ppvOptions = CATEGORY_OPTIONS.filter(opt => opt.group === "ppv");
  const otherOptions = CATEGORY_OPTIONS.filter(opt => opt.group === "other");

  const handleCategoryChange = (transactionIndex: number, newCategory: string) => {
    if (onCategoryChange) {
      onCategoryChange(transactionIndex, newCategory as TransactionCategory);
    }
  };

  return (
    <Card className="p-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="font-semibold text-lg p-0 h-auto hover:bg-transparent" data-testid="button-toggle-transactions">
              Parsed Transactions ({transactions.length})
            </Button>
          </CollapsibleTrigger>
          {isOpen && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <CollapsibleContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentTransactions.map((transaction, index) => {
                  const actualIndex = startIndex + index;
                  return (
                    <TableRow key={actualIndex} data-testid={`row-transaction-${actualIndex}`}>
                      <TableCell className="font-medium">{transaction.date}</TableCell>
                      <TableCell>{transaction.time}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(transaction.gross)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(transaction.fee)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(transaction.net)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={transaction.category}
                          onValueChange={(value) => handleCategoryChange(actualIndex, value)}
                        >
                          <SelectTrigger className="w-[160px] h-8 text-xs" data-testid={`select-category-${actualIndex}`}>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel className="text-xs text-muted-foreground">Subscriptions (no chatter pay)</SelectLabel>
                              {subscriptionOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel className="text-xs text-muted-foreground">Welcome Messages (no chatter pay)</SelectLabel>
                              {welcomeOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel className="text-xs text-muted-foreground">PPV / Sales (chatter sales)</SelectLabel>
                              {ppvOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel className="text-xs text-muted-foreground">Other</SelectLabel>
                              {otherOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.description}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
