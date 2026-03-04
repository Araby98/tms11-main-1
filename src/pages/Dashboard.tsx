import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { apiGetTransfers, apiGetUsers, apiGetWishes, apiUpdateWish, apiDeleteWish } from "@/lib/api";
import { User, TransferRequest, TransferWish } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeftRight, RotateCw, Users, Clock, ArrowRight } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLang();
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [wishes, setWishes] = useState<TransferWish[]>([]);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const load = async () => {
      const [tr, us, wi] = await Promise.all([
        apiGetTransfers(),
        apiGetUsers(),
        apiGetWishes(user?.id),
      ]);
      setTransfers(tr);
      setUsers(us);
      setWishes(wi);
    };
    load();
  }, [user?.id]);

  const myTransfers = transfers.filter((tr) =>
    tr.status === "approved" && tr.participants.some((p) => p.userId === user?.id)
  );

  const getUserName = (id: string) => {
    const u = users.find((u) => u.id === id);
    return u ? `${u.firstName} ${u.lastName}` : t("common.unknown");
  };

  const getUserContact = (id: string) => {
    const u = users.find((u) => u.id === id);
    if (!u) return t("common.unknown");
    return `${u.firstName} ${u.lastName}${u.phone ? ` · ${u.phone}` : ""}`;
  };

  // Modal edit flow
  const [editingWish, setEditingWish] = useState<TransferWish | null>(null);
  const [editFrom, setEditFrom] = useState("");
  const [editTo, setEditTo] = useState("");

  const openEdit = (w: TransferWish) => {
    setEditingWish(w);
    setEditFrom(w.fromProvince);
    setEditTo(w.toProvince);
  };

  const closeEdit = () => {
    setEditingWish(null);
    setEditFrom("");
    setEditTo("");
  };

  const submitEdit = async () => {
    if (!editingWish) return;
    try {
      const res = await apiUpdateWish(editingWish.id, { fromProvince: editFrom, toProvince: editTo });
      setWishes((prev) => prev.map((pw) => (pw.id === editingWish.id ? res.wish : pw)));
      closeEdit();
    } catch (err) {
      console.error(err);
      alert(t("dash.update_error"));
    }
  };

  const statusLabel: Record<string, string> = {
    pending: t("dash.pending"),
    approved: t("dash.approved"),
    rejected: t("dash.rejected"),
  };

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    approved: "default",
    rejected: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dash.welcome")} {user?.firstName}</h1>
        <p className="text-muted-foreground">{t("dash.province")} {user?.fromProvince} · {t("dash.grade")} {user?.grade}</p>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">{t("dash.users_count")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-lg bg-secondary/30">
                <ArrowLeftRight className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{transfers.filter((tr) => tr.type === "mutual").length}</p>
                <p className="text-sm text-muted-foreground">{t("dash.mutual_count")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-lg bg-secondary/30">
                <RotateCw className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{transfers.filter((tr) => tr.type === "cycle").length}</p>
                <p className="text-sm text-muted-foreground">{t("dash.cycle_count")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" /> {t("dash.my_requests")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wishes.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("dash.no_requests")}</p>
          ) : (
            <div className="space-y-3">
              {wishes.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{w.fromProvince} → {w.toProvince}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(w.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {w.userId === user?.id && (
                      <>
                        <button className="text-sm text-primary underline" onClick={() => openEdit(w)}>{t("common.edit")}</button>
                        <button
                          className="text-sm text-destructive underline"
                          onClick={async () => {
                            if (!confirm(t("dash.confirm_delete"))) return;
                            try {
                              await apiDeleteWish(w.id);
                              setWishes((prev) => prev.filter((pw) => pw.id !== w.id));
                            } catch (err) {
                              console.error(err);
                              alert(t("dash.delete_error"));
                            }
                          }}
                        >
                          {t("common.delete")}
                        </button>
                      </>
                    )}

                    {w.matchedTransferId ? (() => {
                      const tr = transfers.find((t) => t.id === w.matchedTransferId);
                      if (tr?.status === "approved") return <Badge variant="default">{t("dash.matched")}</Badge>;
                      if (tr?.status === "rejected") return <Badge variant="destructive">{t("dash.rejected")}</Badge>;
                      return <Badge variant="outline">{t("dash.pending")}</Badge>;
                    })() : (
                      <Badge variant="outline">{t("dash.pending")}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {myTransfers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> {t("dash.my_transfers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myTransfers.map((tr) => (
                <div key={tr.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {tr.type === "mutual" ? (
                      <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <RotateCw className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {tr.type === "mutual" ? t("dash.mutual") : t("dash.cycle")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tr.participants.map((p) => `${getUserContact(p.userId)} (${p.fromProvince} → ${p.toProvince})`).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusVariant[tr.status]}>{statusLabel[tr.status]}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Wish Modal */}
      <Dialog open={!!editingWish} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dash.edit_request")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("dash.from_province")}</Label>
              <Input value={editFrom} onChange={(e) => setEditFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("dash.to_province")}</Label>
              <Input value={editTo} onChange={(e) => setEditTo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={closeEdit}>{t("common.cancel")}</Button>
            <Button onClick={submitEdit}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
